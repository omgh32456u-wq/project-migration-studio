/**
 * Browser side of Mizo text chat: builds the minimal request from on-device history and reads the
 * streamed answer. Only role + text of recent messages are sent — never profile, logs or account data.
 */
import type { MizoMessage } from './chat-store'
import {
  MIZO_CONSENT_VERSION,
  boundContext,
  type MizoChatRequest,
  type MizoErrorCode,
  type MizoLocale,
  type MizoStreamEvent,
  type MizoWireMemory,
  type MizoWireMessage,
} from './protocol'

export interface MizoUsage {
  usedToday: number
  dailyLimit: number
  resetsAt: string
}

export type MizoResult =
  | { ok: true; usage: MizoUsage | null }
  | { ok: false; code: MizoErrorCode; resetsAt?: string; aborted: boolean; usage: MizoUsage | null }

export type MizoTransport = (input: {
  request: MizoChatRequest
  signal: AbortSignal
  onDelta: (text: string) => void
}) => Promise<MizoResult>

/**
 * History of the open chat up to (and including) the question being answered, as role/content pairs
 * only, plus the already-selected relevant memories. Other chats are never included.
 */
export function buildMizoRequest(history: MizoMessage[], locale: MizoLocale, memories: MizoWireMemory[] = []): MizoChatRequest {
  const messages: MizoWireMessage[] = history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.text.trim())
    .map((m) => ({ role: m.role, content: m.text.trim().slice(0, 2000) }))
  const request: MizoChatRequest = { locale, consentVersion: MIZO_CONSENT_VERSION, messages: boundContext(messages) }
  if (memories.length) request.memories = memories.map((m) => ({ category: m.category, content: m.content }))
  return request
}

/** Same-origin on the web. A bundled Android build sets `VITE_MIZO_API_ORIGIN` to the published https origin. */
export function mizoEndpoint(): string {
  const origin = (import.meta.env.VITE_MIZO_API_ORIGIN as string | undefined)?.replace(/\/+$/, '') ?? ''
  return `${origin}/api/public/mizo/chat`
}

const ERROR_CODES = new Set<MizoErrorCode>([
  'unauthenticated', 'invalid_request', 'consent_required', 'daily_limit', 'concurrent_limit', 'burst_limit',
  'provider_not_configured', 'usage_unavailable', 'provider_auth', 'provider_forbidden', 'provider_rate_limited',
  'provider_quota', 'provider_bad_request', 'provider_unavailable', 'provider_malformed', 'timeout',
])

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

async function readError(res: Response): Promise<{ code: MizoErrorCode; resetsAt?: string }> {
  if (res.status === 404) return { code: 'unavailable' }
  try {
    const body = (await res.json()) as { error?: { code?: string; resetsAt?: string } }
    const code = body?.error?.code as MizoErrorCode | undefined
    if (code && ERROR_CODES.has(code)) return { code, resetsAt: body.error?.resetsAt }
  } catch {
    /* not our JSON */
  }
  return { code: res.status === 401 ? 'unauthenticated' : res.status >= 500 ? 'unavailable' : 'unknown' }
}

/** Parses the endpoint's server-sent events. */
export async function* readMizoEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<MizoStreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        let type = ''
        let data = ''
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) type = line.slice(6).trim()
          else if (line.startsWith('data:')) data += line.slice(5).trim()
        }
        if (!type) continue
        let payload: Record<string, unknown> = {}
        try {
          payload = data ? (JSON.parse(data) as Record<string, unknown>) : {}
        } catch {
          continue
        }
        yield { type, ...payload } as MizoStreamEvent
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function createMizoTransport(getToken: () => Promise<string | null>, fetchImpl: typeof fetch = (...a) => fetch(...a), endpoint = mizoEndpoint()): MizoTransport {
  return async ({ request, signal, onDelta }) => {
    let usage: MizoUsage | null = null
    const fail = (code: MizoErrorCode, aborted = false, resetsAt?: string): MizoResult => ({ ok: false, code, aborted, resetsAt, usage })
    if (isOffline()) return fail('offline')
    const token = await getToken()
    if (!token) return fail('unauthenticated')
    let res: Response
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(request),
      })
    } catch {
      if (signal.aborted) return fail('unknown', true)
      return fail(isOffline() ? 'offline' : 'network')
    }
    if (!res) return fail('network')
    if (!res.ok) {
      const e = await readError(res)
      return fail(e.code, false, e.resetsAt)
    }
    if (!res.body || !(res.headers.get('content-type') ?? '').includes('text/event-stream')) return fail('provider_malformed')
    try {
      for await (const event of readMizoEvents(res.body)) {
        if (event.type === 'meta') usage = { usedToday: event.usedToday, dailyLimit: event.dailyLimit, resetsAt: event.resetsAt }
        else if (event.type === 'delta' && typeof event.text === 'string') onDelta(event.text)
        else if (event.type === 'done') return { ok: true, usage }
        else if (event.type === 'error') return fail(ERROR_CODES.has(event.code) ? event.code : 'unknown')
      }
    } catch {
      if (signal.aborted) return fail('unknown', true)
      return fail(isOffline() ? 'offline' : 'network')
    }
    if (signal.aborted) return fail('unknown', true)
    return fail('network')
  }
}
