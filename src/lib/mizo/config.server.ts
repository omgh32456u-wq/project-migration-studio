/**
 * Mizo server configuration, read from server environment variables inside the request handler.
 * Switching to another OpenAI-compatible provider is configuration only:
 *   MIZO_PROVIDER=openai_compatible, MIZO_PROVIDER_BASE_URL, MIZO_PROVIDER_API_KEY, MIZO_MODEL.
 */

export interface MizoLimits {
  /** Accepted requests per account per UTC day. */
  dailyRequests: number
  /** Requests one account may have running at once. */
  concurrent: number
  /** Requests one account may start in any 60 seconds. */
  burstPerMinute: number
  /** Output cap sent to the provider. */
  maxOutputTokens: number
  /** Whole-request time limit, in milliseconds. */
  timeoutMs: number
}

export const MIZO_DEFAULT_LIMITS: MizoLimits = {
  dailyRequests: 15,
  concurrent: 2,
  burstPerMinute: 5,
  maxOutputTokens: 700,
  timeoutMs: 60_000,
}

export interface MizoProviderConfig {
  id: 'ashna' | 'openai_compatible'
  baseUrl: string
  model: string
  /** Absent until the secret is added; the endpoint then answers `provider_not_configured`. */
  apiKey: string | null
}

export interface MizoConfig {
  provider: MizoProviderConfig | null
  limits: MizoLimits
}

const PROVIDERS = {
  ashna: { baseUrl: 'https://api.ashna.ai/v1/api', model: 'ashna-x1', keyEnv: 'ASHNA_API_KEY' },
  openai_compatible: { baseUrl: '', model: '', keyEnv: 'MIZO_PROVIDER_API_KEY' },
} as const

type Env = Record<string, string | undefined>

function int(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback
}

function httpsUrl(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'https:' ? u.href.replace(/\/+$/, '') : null
  } catch {
    return null
  }
}

export function readMizoConfig(env: Env): MizoConfig {
  const limits: MizoLimits = {
    dailyRequests: int(env, 'MIZO_DAILY_REQUEST_LIMIT', MIZO_DEFAULT_LIMITS.dailyRequests, 0, 1000),
    concurrent: int(env, 'MIZO_CONCURRENT_LIMIT', MIZO_DEFAULT_LIMITS.concurrent, 1, 10),
    burstPerMinute: int(env, 'MIZO_BURST_PER_MINUTE', MIZO_DEFAULT_LIMITS.burstPerMinute, 1, 60),
    maxOutputTokens: int(env, 'MIZO_MAX_OUTPUT_TOKENS', MIZO_DEFAULT_LIMITS.maxOutputTokens, 50, 4000),
    timeoutMs: int(env, 'MIZO_TIMEOUT_MS', MIZO_DEFAULT_LIMITS.timeoutMs, 5_000, 120_000),
  }
  const id = (env['MIZO_PROVIDER']?.trim() || 'ashna') as keyof typeof PROVIDERS
  const preset = PROVIDERS[id]
  if (!preset) return { provider: null, limits }
  const baseUrl = httpsUrl(env['MIZO_PROVIDER_BASE_URL']) ?? httpsUrl(preset.baseUrl)
  const model = env['MIZO_MODEL']?.trim() || preset.model
  if (!baseUrl || !model) return { provider: null, limits }
  const apiKey = env[preset.keyEnv]?.trim() || null
  return { provider: { id, baseUrl, model, apiKey }, limits }
}
