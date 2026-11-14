/**
 * Mizo text endpoint logic, independent of the runtime so it can be tested with fakes.
 * Order of checks: session → request shape → consent → provider configured → quota → provider.
 * The account id always comes from the verified session, never from the request body.
 */
import { mizoSystemPrompt } from './persona.server'
import { ProviderError, type ChatProvider } from './provider.server'
import type { MizoConfig, MizoLimits, MizoProviderConfig } from './config.server'
import {
  MIZO_CONSENT_VERSION,
  MIZO_MAX_MESSAGE_CHARS,
  boundContext,
  type MizoErrorCode,
  type MizoLocale,
  type MizoStreamEvent,
  type MizoWireMessage,
} from './protocol'

export type UsageOutcome = 'ok' | 'daily_limit' | 'concurrent_limit' | 'burst_limit'

export interface UsageBegin {
  outcome: UsageOutcome
  requestId: string | null
  usedToday: number
  dailyLimit: number
  resetsAt: string
}

export interface MizoUsageStore {
  /** Atomically checks the limits for this account and, when allowed, records a running request. */
  begin(userId: string, limits: MizoLimits): Promise<UsageBegin>
  finish(requestId: string, userId: string, status: 'completed' | 'aborted' | 'failed', outputChars: number): Promise<void>
}

export interface MizoHandlerDeps {
  /** Validates the bearer token with Supabase Auth. Null for anything not a real signed-in user. */
  verifyUser(token: string): Promise<{ id: string } | null>
  usage: MizoUsageStore
  config: MizoConfig
  createProvider(config: MizoProviderConfig & { apiKey: string }): ChatProvider
  /** Extra origins (e.g. the Android shell) allowed to call cross-origin. */
  allowedOrigins?: readonly string[]
}

export const MIZO_NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'] as const
const MAX_BODY_BYTES = 64 * 1024
const MAX_MESSAGES = 60

const STATUS: Record<MizoErrorCode, number> = {
  unauthenticated: 401,
  invalid_request: 400,
  consent_required: 403,
  daily_limit: 429,
  concurrent_limit: 429,
  burst_limit: 429,
  provider_not_configured: 503,
  usage_unavailable: 503,
  provider_auth: 502,
  provider_forbidden: 502,
  provider_rate_limited: 503,
  provider_quota: 503,
  provider_bad_request: 502,
  provider_unavailable: 502,
  provider_malformed: 502,
  timeout: 504,
  offline: 503,
  network: 503,
  unavailable: 503,
  unknown: 500,
}

function corsHeaders(request: Request, extra: readonly string[]): Record<string, string> {
  const origin = request.headers.get('origin')
  if (!origin || !extra.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

function errorResponse(code: MizoErrorCode, cors: Record<string, string>, resetsAt?: string): Response {
  return new Response(JSON.stringify({ error: resetsAt ? { code, resetsAt } : { code } }), {
    status: STATUS[code],
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  })
}

export interface ParsedMizoRequest {
  locale: MizoLocale
  consentVersion: number
  messages: MizoWireMessage[]
}

/** Strict whitelist: only locale, consent version and role/content pairs survive. Everything else is dropped. */
export function parseMizoRequest(raw: unknown): ParsedMizoRequest | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (r['locale'] !== 'en' && r['locale'] !== 'ar') return null
  if (typeof r['consentVersion'] !== 'number') return null
  const list = r['messages']
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_MESSAGES) return null
  const messages: MizoWireMessage[] = []
  for (const m of list) {
    if (!m || typeof m !== 'object') return null
    const { role, content } = m as Record<string, unknown>
    if (role !== 'user' && role !== 'assistant') return null
    if (typeof content !== 'string') return null
    const text = content.trim()
    if (!text || text.length > MIZO_MAX_MESSAGE_CHARS) return null
    messages.push({ role, content: text })
  }
  if (messages[messages.length - 1].role !== 'user') return null
  return { locale: r['locale'], consentVersion: r['consentVersion'], messages: boundContext(messages) }
}

function sse(event: MizoStreamEvent): string {
  const { type, ...data } = event
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function handleMizoChat(request: Request, deps: MizoHandlerDeps): Promise<Response> {
  const cors = corsHeaders(request, deps.allowedOrigins ?? MIZO_NATIVE_ORIGINS)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...cors } })

  // 1. Session. A missing, malformed, expired or revoked token never reaches the provider.
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return errorResponse('unauthenticated', cors)
  let user: { id: string } | null = null
  try {
    user = await deps.verifyUser(token)
  } catch {
    user = null
  }
  if (!user?.id) return errorResponse('unauthenticated', cors)
  const userId = user.id

  // 2. Request shape.
  let parsed: ParsedMizoRequest | null = null
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return errorResponse('invalid_request', cors)
    parsed = parseMizoRequest(JSON.parse(text))
  } catch {
    parsed = null
  }
  if (!parsed) return errorResponse('invalid_request', cors)

  // 3. Consent. The app sends the version the person agreed to; nothing leaves without it.
  if (parsed.consentVersion !== MIZO_CONSENT_VERSION) return errorResponse('consent_required', cors)

  // 4. Provider configured (checked before the quota so a missing key never uses up anyone's day).
  const providerConfig = deps.config.provider
  if (!providerConfig?.apiKey) return errorResponse('provider_not_configured', cors)

  // 5. Quota and rate limits, atomically on the server. Fails closed.
  let begin: UsageBegin
  try {
    begin = await deps.usage.begin(userId, deps.config.limits)
  } catch {
    return errorResponse('usage_unavailable', cors)
  }
  if (begin.outcome !== 'ok' || !begin.requestId) {
    return errorResponse(begin.outcome === 'ok' ? 'usage_unavailable' : begin.outcome, cors, begin.outcome === 'daily_limit' ? begin.resetsAt : undefined)
  }
  const requestId = begin.requestId
  const finish = async (status: 'completed' | 'aborted' | 'failed', chars: number) => {
    try {
      await deps.usage.finish(requestId, userId, status, chars)
    } catch {
      console.error('[mizo] could not close usage record')
    }
  }

  // 6. Provider call with a time limit; the person's Stop (disconnect) aborts it too.
  const abort = new AbortController()
  let reason: 'timeout' | 'client' | null = null
  const timer = setTimeout(() => {
    reason ??= 'timeout'
    abort.abort()
  }, deps.config.limits.timeoutMs)
  const onClientAbort = () => {
    reason ??= 'client'
    abort.abort()
  }
  request.signal?.addEventListener('abort', onClientAbort)
  const cleanup = () => {
    clearTimeout(timer)
    request.signal?.removeEventListener('abort', onClientAbort)
  }
  const failureCode = (e: unknown): MizoErrorCode => (reason === 'timeout' ? 'timeout' : e instanceof ProviderError ? e.code : 'provider_unavailable')

  const provider = deps.createProvider({ ...providerConfig, apiKey: providerConfig.apiKey })
  const pieces = provider.stream({
    system: mizoSystemPrompt(parsed.locale),
    messages: parsed.messages,
    maxTokens: deps.config.limits.maxOutputTokens,
    signal: abort.signal,
  })

  // Wait for the first piece so failures before any text get a proper status and don't use up the quota.
  let first: IteratorResult<string, void>
  try {
    first = await pieces.next()
    while (!first.done && !first.value) first = await pieces.next()
  } catch (e) {
    cleanup()
    const code = failureCode(e)
    console.error(`[mizo] provider failed before reply: ${code}`)
    await finish(reason === 'client' ? 'aborted' : 'failed', 0)
    return errorResponse(code, cors)
  }
  if (first.done) {
    cleanup()
    await finish('failed', 0)
    return errorResponse('provider_malformed', cors)
  }

  const encoder = new TextEncoder()
  let chars = 0
  const body = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const send = (e: MizoStreamEvent) => {
        try {
          ctrl.enqueue(encoder.encode(sse(e)))
        } catch {
          /* the reader is gone */
        }
      }
      send({ type: 'meta', usedToday: begin.usedToday, dailyLimit: begin.dailyLimit, resetsAt: begin.resetsAt })
      chars += first.value!.length
      send({ type: 'delta', text: first.value! })
      try {
        for (;;) {
          const next = await pieces.next()
          if (next.done) break
          if (!next.value) continue
          chars += next.value.length
          send({ type: 'delta', text: next.value })
        }
        cleanup()
        send({ type: 'done' })
        await finish('completed', chars)
      } catch (e) {
        cleanup()
        if (reason !== 'client') send({ type: 'error', code: failureCode(e) })
        await finish('aborted', chars)
      }
      try {
        ctrl.close()
      } catch {
        /* already closed */
      }
    },
    cancel() {
      onClientAbort()
    },
  })

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
      ...cors,
    },
  })
}
