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
}

export const CHAT_DB_NAME = 'mizano-mizo'
const CHAT_DB_VERSION = 1
const STORE = 'conversations'

export function emptyConversation(userId: string): MizoConversation {
  return { userId, messages: [], updatedAt: new Date(0).toISOString() }
}

function assertUser(userId: string) {
  if (!userId) throw new Error('Mizo history needs a signed-in account')
}

export class MemoryChatStore implements ChatStore {
  private map = new Map<string, MizoConversation>()
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
  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const tx = this.db.transaction(STORE, mode)
    const result = await req(fn(tx.objectStore(STORE)))
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
}

export async function openChatStore(factory: IDBFactory | undefined = typeof indexedDB === 'undefined' ? undefined : indexedDB): Promise<ChatStore> {
  if (!factory) return new MemoryChatStore()
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = factory.open(CHAT_DB_NAME, CHAT_DB_VERSION)
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'userId' })
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
