/**
 * Mizo conversation history, kept on this device only and scoped to one signed-in account.
 * Lives in its own IndexedDB database (`mizano-mizo`) so the main `track-meals-macros` database,
 * its version and its backups are never touched. Guests have no Mizo history at all.
 */
export interface MizoMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  /** Assistant replies only: `stopped` = Stop pressed, `cut` = connection or service broke off mid-reply. */
  status?: 'complete' | 'stopped' | 'cut'
  /** Assistant replies only: the question this answers, so a retry never saves a second copy. */
  replyTo?: string
}

/** Per-account, on-device record of the Mizo sharing consent. Deleting the chat does not change it. */
export interface MizoConsent {
  userId: string
  /** The consent wording version agreed to (see `MIZO_CONSENT_VERSION`). */
  version: number
  granted: boolean
  updatedAt: string
}

export interface MizoConversation {
  /** The Supabase account id; the only key, so one account can never read another's chat. */
  userId: string
  messages: MizoMessage[]
  updatedAt: string
}

export interface ChatStore {
  load(userId: string): Promise<MizoConversation>
  save(conversation: MizoConversation): Promise<void>
  remove(userId: string): Promise<void>
  loadConsent(userId: string): Promise<MizoConsent | null>
  saveConsent(consent: MizoConsent): Promise<void>
}

export const CHAT_DB_NAME = 'mizano-mizo'
/** v2 adds the `consent` store; v1 conversations are kept as they are. */
const CHAT_DB_VERSION = 2
const STORE = 'conversations'
const CONSENT = 'consent'

export function emptyConversation(userId: string): MizoConversation {
  return { userId, messages: [], updatedAt: new Date(0).toISOString() }
}

function assertUser(userId: string) {
  if (!userId) throw new Error('Mizo history needs a signed-in account')
}

export class MemoryChatStore implements ChatStore {
  private map = new Map<string, MizoConversation>()
  private consent = new Map<string, MizoConsent>()
  async loadConsent(userId: string) {
    assertUser(userId)
    const c = this.consent.get(userId)
    return c ? { ...c } : null
  }
  async saveConsent(c: MizoConsent) {
    assertUser(c.userId)
    this.consent.set(c.userId, { ...c })
  }
  async load(userId: string) {
    assertUser(userId)
    const c = this.map.get(userId)
    return c ? structuredClone(c) : emptyConversation(userId)
  }
  async save(c: MizoConversation) {
    assertUser(c.userId)
    this.map.set(c.userId, structuredClone(c))
  }
  async remove(userId: string) {
    this.map.delete(userId)
  }
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

class IdbChatStore implements ChatStore {
  constructor(private db: IDBDatabase) {
    db.onversionchange = () => db.close()
  }
  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>, store = STORE): Promise<T> {
    const tx = this.db.transaction(store, mode)
    const result = await req(fn(tx.objectStore(store)))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error('aborted'))
    })
    return result
  }
  async load(userId: string) {
    assertUser(userId)
    const c = (await this.run('readonly', (s) => s.get(userId))) as MizoConversation | undefined
    return c && c.userId === userId ? c : emptyConversation(userId)
  }
  async save(c: MizoConversation) {
    assertUser(c.userId)
    await this.run('readwrite', (s) => s.put(c))
  }
  async remove(userId: string) {
    await this.run('readwrite', (s) => s.delete(userId))
  }
  async loadConsent(userId: string) {
    assertUser(userId)
    const c = (await this.run('readonly', (s) => s.get(userId), CONSENT)) as MizoConsent | undefined
    return c && c.userId === userId ? c : null
  }
  async saveConsent(c: MizoConsent) {
    assertUser(c.userId)
    await this.run('readwrite', (s) => s.put(c), CONSENT)
  }
}

export async function openChatStore(factory: IDBFactory | undefined = typeof indexedDB === 'undefined' ? undefined : indexedDB): Promise<ChatStore> {
  if (!factory) return new MemoryChatStore()
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = factory.open(CHAT_DB_NAME, CHAT_DB_VERSION)
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'userId' })
        if (!r.result.objectStoreNames.contains(CONSENT)) r.result.createObjectStore(CONSENT, { keyPath: 'userId' })
      }
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    return new IdbChatStore(db)
  } catch {
    return new MemoryChatStore()
  }
}

let shared: Promise<ChatStore> | null = null
/** One store per page, opened on first use (only ever from a signed-in Mizo screen). */
export function sharedChatStore(): Promise<ChatStore> {
  return (shared ??= openChatStore())
}
