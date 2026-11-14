import { createFileRoute } from '@tanstack/react-router'

/**
 * Mizo text endpoint. Lives under /api/public so the Android shell can reach it on the published
 * site; every request is still authenticated here with the caller's Supabase session.
 * Secrets (provider key, service role) are read only inside the handler, never at module scope.
 */
async function handle(request: Request): Promise<Response> {
  const [{ handleMizoChat }, { readMizoConfig }, { createOpenAiCompatibleProvider }] = await Promise.all([
    import('@/lib/mizo/chat-handler.server'),
    import('@/lib/mizo/config.server'),
    import('@/lib/mizo/provider.server'),
  ])
  const config = readMizoConfig(process.env as Record<string, string | undefined>)

  const admin = async () => (await import('@/integrations/supabase/client.server')).supabaseAdmin

  return handleMizoChat(request, {
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
}

export const Route = createFileRoute('/api/public/mizo/chat')({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      OPTIONS: ({ request }) => handle(request),
    },
  },
})
