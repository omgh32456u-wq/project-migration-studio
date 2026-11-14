/**
 * OpenAI-compatible Chat Completions adapter (AshnaAI by default). Any provider speaking the same
 * protocol can be substituted through configuration; the chat screen and history never change.
 */
import type { MizoErrorCode, MizoWireMessage } from './protocol'
import type { MizoProviderConfig } from './config.server'

export interface ChatProviderInput {
  system: string
  messages: MizoWireMessage[]
  maxTokens: number
  signal: AbortSignal
}

export interface ChatProvider {
  readonly id: string
  /** Yields answer text pieces. Throws `ProviderError` for any failure. */
  stream(input: ChatProviderInput): AsyncGenerator<string, void, undefined>
}

export class ProviderError extends Error {
  constructor(
    readonly code: MizoErrorCode,
    readonly status?: number,
  ) {
    super(code)
    this.name = 'ProviderError'
  }
}

/** Maps a provider HTTP failure to an app code. Raw provider messages never reach the app. */
export function mapProviderStatus(status: number, errorCode?: string): MizoErrorCode {
  const c = (errorCode ?? '').toLowerCase()
  if (status === 401) return 'provider_auth'
  if (status === 402 || /quota|insufficient|credit|billing/.test(c)) return 'provider_quota'
  if (status === 403) return 'provider_forbidden'
  if (status === 429) return 'provider_rate_limited'
  if (status === 408 || status === 504) return 'timeout'
  if (status >= 500) return 'provider_unavailable'
  if (status >= 400) return 'provider_bad_request'
  return 'provider_malformed'
}

async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { error?: { code?: unknown; type?: unknown } }
    const code = body?.error?.code ?? body?.error?.type
    return typeof code === 'string' ? code : undefined
  } catch {
    return undefined
  }
}

function chunkText(json: unknown): string {
  const choice = (json as { choices?: Array<{ delta?: { content?: unknown }; message?: { content?: unknown } }> })?.choices?.[0]
  const content = choice?.delta?.content ?? choice?.message?.content
  return typeof content === 'string' ? content : ''
}

/** Parses an OpenAI-style SSE body (`data: {...}` lines ending with `data: [DONE]`). */
export async function* parseOpenAiSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string, void, undefined> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sawData = false
  let done = false
  try {
    while (!done) {
      const { value, done: end } = await reader.read()
      if (end) break
      buffer += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).replace(/\r$/, '')
        buffer = buffer.slice(nl + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data) continue
        if (data === '[DONE]') {
          done = true
          break
        }
        let json: unknown
        try {
          json = JSON.parse(data)
        } catch {
          throw new ProviderError('provider_malformed')
        }
        const err = (json as { error?: { code?: unknown; type?: unknown } }).error
        if (err) {
          const code = typeof err.code === 'string' ? err.code : typeof err.type === 'string' ? err.type : ''
          throw new ProviderError(/rate/.test(code) ? 'provider_rate_limited' : /quota|insufficient|credit/.test(code) ? 'provider_quota' : 'provider_unavailable')
        }
        sawData = true
        const text = chunkText(json)
        if (text) yield text
      }
    }
  } finally {
    reader.releaseLock()
  }
  if (!done && !sawData) throw new ProviderError('provider_malformed')
}

export function createOpenAiCompatibleProvider(config: MizoProviderConfig & { apiKey: string }, fetchImpl: typeof fetch = fetch): ChatProvider {
  return {
    id: config.id,
    async *stream({ system, messages, maxTokens, signal }) {
      let res: Response
      try {
        res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          signal,
          headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            model: config.model,
            stream: true,
            max_tokens: maxTokens,
            messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
          }),
        })
      } catch (e) {
        if (signal.aborted) throw e
        throw new ProviderError('provider_unavailable')
      }
      if (!res.ok) throw new ProviderError(mapProviderStatus(res.status, await readErrorCode(res)), res.status)
      const type = res.headers.get('content-type') ?? ''
      if (type.includes('application/json')) {
        // Some providers answer without streaming; accept a complete chat.completion object.
        let json: unknown
        try {
          json = await res.json()
        } catch {
          throw new ProviderError('provider_malformed')
        }
        const text = chunkText(json)
        if (!text) throw new ProviderError('provider_malformed')
        yield text
        return
      }
      if (!res.body) throw new ProviderError('provider_malformed')
      yield* parseOpenAiSse(res.body)
    },
  }
}
