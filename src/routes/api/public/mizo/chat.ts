import { createFileRoute } from '@tanstack/react-router'

/**
 * Mizo text endpoint. The UI is bundled in the Android APK, so its requests reach
 * this server route cross-origin. Only the known Capacitor localhost origins are allowed.
 * Every POST is still authenticated with the caller's Supabase session.
 */
const NATIVE_ORIGINS = new Set([
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
])

function corsHeaders(request: Request): Headers {
  const headers = new Headers()
  const origin = request.headers.get('origin')
  if (origin && NATIVE_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept')
    headers.set('Access-Control-Max-Age', '600')
  }
  return headers
}

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of corsHeaders(request)) headers.set(key, value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function handle(request: Request): Promise<Response> {
  const [{ handleMizoChat }, { readMizoConfig }, { createOpenAiCompatibleProvider }] = await Promise.all([
    import('@/lib/mizo/chat-handler.server'),
    import('@/lib/mizo/config.server'),
    import('@/lib/mizo/provider.server'),
  ])
  const config = readMizoConfig(process.env as Record<string, string | undefined>)

  const admin = async () => (await import('@/integrations/supabase/client.server')).supabaseAdmin

  const response = await handleMizoChat(request, {
    config,
    createProvider: (c) => createOpenAiCompatibleProvider(c),
    verifyUser: async (token) => {
      const { data, error } = await (await admin()).auth.getUser(token)
      if (error || !data?.user || data.user.is_anonymous) return null
      return { id: data.user.id }
    },
    usage: {
      begin: async (userId, limits) => {
        const { data, error } = await (await admin()).rpc('mizo_begin_request', {
          _user_id: userId,
          _daily_limit: limits.dailyRequests,
          _concurrent_limit: limits.concurrent,
          _burst_limit: limits.burstPerMinute,
        })
        const row = Array.isArray(data) ? data[0] : null
        if (error || !row) throw new Error('usage unavailable')
        return {
          outcome: row.outcome as 'ok' | 'daily_limit' | 'concurrent_limit' | 'burst_limit',
          requestId: row.request_id,
          usedToday: row.used_today,
          dailyLimit: row.daily_limit,
          resetsAt: row.resets_at,
        }
      },
      finish: async (requestId, userId, status, outputChars) => {
        const { error } = await (await admin()).rpc('mizo_finish_request', {
          _request_id: requestId,
          _user_id: userId,
          _status: status,
          _output_chars: outputChars,
        })
        if (error) throw new Error('usage finish failed')
      },
    },
  })
  return withCors(request, response)
}

export const Route = createFileRoute('/api/public/mizo/chat')({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      OPTIONS: ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
    },
  },
})
