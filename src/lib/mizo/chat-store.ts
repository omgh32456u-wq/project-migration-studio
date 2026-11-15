/**
 * Mizo conversation history, kept on this device only and scoped to one signed-in account.
 * Lives in its own IndexedDB database (`mizano-mizo`) so the main `track-meals-macros` database,
 * its version and its backups are never touched. Guests have no Mizo history at all.
 *
 * v3 holds many conversations per account (`threads`, keyed by conversation id) plus the
 * account's last open conversation (`meta`). The v1/v2 single-chat store (`conversations`,
 * keyed by userId) is kept; each account's old chat is copied into `threads` on first open,
 * verified, and only then removed from the old store.
 *
 * v4 adds `memories` (key = memory id, indexed by account): small, user-approved Mizo memories.
 * Nothing else changes; every older store is kept as it was.
 */
import { MIZO_MAX_MEMORIES, MemoryFullError, sameMemory, type MizoMemory, type MizoMemoryCategory } from './memory'

export type { MizoMemory }
export interface MizoMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  /** Assistant replies only: `stopped` = Stop pressed, `cut` = connection or service broke off mid-reply. */
  status?: 'complete' | 'stopped' | 'cut'
  /** Assistant replies only: the question this answers, so a retry never saves a second copy. */
  replyTo?: string
  /** Assistant replies only: how many saved memories went with the question (shown for transparency). */
  usedMemories?: number
  /** Assistant replies only: a memory Mizo suggested; nothing is saved until the person taps Save. */
  memoryProposal?: { content: string; category: MizoMemoryCategory; status: 'pending' | 'saved' | 'dismissed' }
}

/** Per-account, on-device record of the Mizo sharing consent. Conversations never change it. */
export interface MizoConsent {
  userId: string
  /** The consent wording version agreed to (see `MIZO_CONSENT_VERSION`). */
  version: number
  granted: boolean
  updatedAt: string
}

export interface MizoConversation {
  id: string
  /** The Supabase account id; every read and write is checked against it. */
  userId: string
  /** Empty until the first question; then a local title from it, or the user's own name for it. */
  title: string
  titleSource: 'auto' | 'manual'
  /** Reserved so a future Work mode can live beside chats without another rewrite. */
  kind: 'chat'
  messages: MizoMessage[]
  createdAt: string
  updatedAt: string
}

/** The v1/v2 single chat per account. */
export interface LegacyMizoConversation {
  userId: string
  messages: MizoMessage[]
  updatedAt: string
}

export interface ChatStore {
  /** The account's conversations, most recently updated first. */
  list(userId: string): Promise<MizoConversation[]>
  get(userId: string, id: string): Promise<MizoConversation | null>
  save(conversation: MizoConversation): Promise<void>
  remove(userId: string, id: string): Promise<void>
  getActive(userId: string): Promise<string | null>
  setActive(userId: string, id: string | null): Promise<void>
  loadConsent(userId: string): Promise<MizoConsent | null>
  saveConsent(consent: MizoConsent): Promise<void>
  /** The account's saved memories, newest first. */
  listMemories(userId: string): Promise<MizoMemory[]>
  /** Adds or updates one memory. Throws `MemoryFullError` at `MIZO_MAX_MEMORIES`; an identical wording updates the existing one. */
  saveMemory(memory: MizoMemory): Promise<MizoMemory>
  removeMemory(userId: string, id: string): Promise<void>
  clearMemories(userId: string): Promise<void>
}

export const CHAT_DB_NAME = 'mizano-mizo'
/** v2 added `consent`; v3 `threads` and `meta`; v4 `memories`. Nothing is dropped. */
const CHAT_DB_VERSION = 4
const LEGACY = 'conversations'
const THREADS = 'threads'
const META = 'meta'
const CONSENT = 'consent'
const MEMORIES = 'memories'
const TITLE_MAX = 40

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** A local title from the first question: first line, spaces collapsed, cut at a word near 40 characters. */
export function titleFrom(text: string): string {
  const line = text.split('\n').find((l) => l.trim())?.replace(/\s+/g, ' ').trim() ?? ''
  const chars = Array.from(line)
  if (chars.length <= TITLE_MAX) return line
  const cut = chars.slice(0, TITLE_MAX).join('')
  const space = cut.lastIndexOf(' ')
  return `${(space > TITLE_MAX / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}

export function newConversation(userId: string, now = new Date().toISOString()): MizoConversation {
  return { id: newId(), userId, title: '', titleSource: 'auto', kind: 'chat', messages: [], createdAt: now, updatedAt: now }
}

export const legacyConversationId = (userId: string) => `legacy-${userId}`

/** The v3 copy of an account's old single chat; the id is fixed so copying twice never duplicates it. */
export function fromLegacy(l: LegacyMizoConversation): MizoConversation {
  const first = l.messages.find((m) => m.role === 'user')
  return {
    id: legacyConversationId(l.userId),
    userId: l.userId,
    title: first ? titleFrom(first.text) : '',
    titleSource: 'auto',
    kind: 'chat',
    messages: l.messages,
    createdAt: l.messages[0]?.createdAt ?? l.updatedAt,
    updatedAt: l.updatedAt,
  }
}

const sameMessages = (a: MizoMessage[], b: MizoMessage[]) => JSON.stringify(a) === JSON.stringify(b)
const byRecent = (a: { updatedAt: string }, b: { updatedAt: string }) => b.updatedAt.localeCompare(a.updatedAt)

/** Shared add/update rule: same account only, identical wording merges, bounded count. */
function mergeMemory(own: MizoMemory[], m: MizoMemory, foreign: MizoMemory | undefined): MizoMemory {
  if (!m.content.trim()) throw new Error('Empty memory')
  if (foreign && foreign.userId !== m.userId) throw new Error('Memory belongs to another account')
  const same = own.find((x) => x.id !== m.id && sameMemory(x.content, m.content))
  if (same) return { ...same, updatedAt: m.updatedAt }
  if (!own.some((x) => x.id === m.id) && own.length >= MIZO_MAX_MEMORIES) throw new MemoryFullError()
  return m
}
function assertUser(userId: string) {
  if (!userId) throw new Error('Mizo history needs a signed-in account')
}

export class MemoryChatStore implements ChatStore {
  private threads = new Map<string, MizoConversation>()
  private active = new Map<string, string>()
  private consent = new Map<string, MizoConsent>()
  private memories = new Map<string, MizoMemory>()
  async list(userId: string) {
    assertUser(userId)
    return [...this.threads.values()].filter((c) => c.userId === userId).map((c) => structuredClone(c)).sort(byRecent)
  }
  async get(userId: string, id: string) {
    assertUser(userId)
    const c = this.threads.get(id)
    return c && c.userId === userId ? structuredClone(c) : null
  }
  async save(c: MizoConversation) {
    assertUser(c.userId)
    const existing = this.threads.get(c.id)
    if (existing && existing.userId !== c.userId) throw new Error('Conversation belongs to another account')
    this.threads.set(c.id, structuredClone(c))
  }
  async remove(userId: string, id: string) {
    assertUser(userId)
    if (this.threads.get(id)?.userId === userId) this.threads.delete(id)
  }
  async getActive(userId: string) {
    assertUser(userId)
    return this.active.get(userId) ?? null
  }
  async setActive(userId: string, id: string | null) {
    assertUser(userId)
    if (id) this.active.set(userId, id)
    else this.active.delete(userId)
  }
  async loadConsent(userId: string) {
    assertUser(userId)
    const c = this.consent.get(userId)
    return c ? { ...c } : null
  }
  async saveConsent(c: MizoConsent) {
    assertUser(c.userId)
    this.consent.set(c.userId, { ...c })
  }
  async listMemories(userId: string) {
    assertUser(userId)
    return [...this.memories.values()].filter((m) => m.userId === userId).map((m) => structuredClone(m)).sort(byRecent)
  }
  async saveMemory(m: MizoMemory) {
    assertUser(m.userId)
    const saved = mergeMemory(await this.listMemories(m.userId), m, this.memories.get(m.id))
    this.memories.set(saved.id, structuredClone(saved))
    return structuredClone(saved)
  }
  async removeMemory(userId: string, id: string) {
    assertUser(userId)
    if (this.memories.get(id)?.userId === userId) this.memories.delete(id)
  }
  async clearMemories(userId: string) {
    assertUser(userId)
    for (const [id, m] of this.memories) if (m.userId === userId) this.memories.delete(id)
  }
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('aborted'))
  })
}

class IdbChatStore implements ChatStore {
  private migrated = new Set<string>()
  constructor(private db: IDBDatabase) {
    db.onversionchange = () => db.close()
  }
  /** Completion handlers are attached before any request runs, so a fast commit is never missed. */
  private async run<T>(stores: string | string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    const tx = this.db.transaction(stores, mode)
    const finished = done(tx)
    const result = await fn(tx)
    await finished
    return result
  }

  /**
   * Copies this account's old single chat into `threads` (one transaction), then re-reads the copy
   * and removes the old record only if every message matches. Safe to repeat after any interruption.
   */
  async migrate(userId: string) {
    if (this.migrated.has(userId)) return
    const legacy = await this.run([LEGACY, THREADS, META], 'readwrite', async (tx) => {
      const old = (await req(tx.objectStore(LEGACY).get(userId))) as LegacyMizoConversation | undefined
      if (!old || old.userId !== userId) return null
      if (old.messages.length === 0) return old
      const id = legacyConversationId(userId)
      const copy = (await req(tx.objectStore(THREADS).get(id))) as MizoConversation | undefined
      if (!copy) {
        tx.objectStore(THREADS).put(fromLegacy(old))
        const meta = (await req(tx.objectStore(META).get(userId))) as { activeId?: string } | undefined
        if (!meta?.activeId) tx.objectStore(META).put({ userId, activeId: id })
      }
      return old
    })
    if (legacy) {
      const copy = await this.get(userId, legacyConversationId(userId))
      const verified = legacy.messages.length === 0 || (copy !== null && sameMessages(copy.messages, legacy.messages))
      // A copy the user has since added to also contains every old message at the start.
      const extended = copy !== null && sameMessages(copy.messages.slice(0, legacy.messages.length), legacy.messages)
      if (!verified && !extended) throw new Error('Mizo history copy could not be verified')
      await this.run(LEGACY, 'readwrite', async (tx) => void tx.objectStore(LEGACY).delete(userId))
    }
    this.migrated.add(userId)
  }

  async list(userId: string) {
    assertUser(userId)
    await this.migrate(userId)
    const all = await this.run(THREADS, 'readonly', (tx) => req(tx.objectStore(THREADS).index('userId').getAll(userId)) as Promise<MizoConversation[]>)
    return all.filter((c) => c.userId === userId).sort(byRecent)
  }
  async get(userId: string, id: string) {
    assertUser(userId)
    const c = (await this.run(THREADS, 'readonly', (tx) => req(tx.objectStore(THREADS).get(id)))) as MizoConversation | undefined
    return c && c.userId === userId ? c : null
  }
  async save(c: MizoConversation) {
    assertUser(c.userId)
    await this.run(THREADS, 'readwrite', async (tx) => {
      const s = tx.objectStore(THREADS)
      const existing = (await req(s.get(c.id))) as MizoConversation | undefined
      if (existing && existing.userId !== c.userId) throw new Error('Conversation belongs to another account')
      s.put(c)
    })
  }
  async remove(userId: string, id: string) {
    assertUser(userId)
    await this.run(THREADS, 'readwrite', async (tx) => {
      const s = tx.objectStore(THREADS)
      const existing = (await req(s.get(id))) as MizoConversation | undefined
      if (existing?.userId === userId) s.delete(id)
    })
  }
  async getActive(userId: string) {
    assertUser(userId)
    await this.migrate(userId)
    const m = (await this.run(META, 'readonly', (tx) => req(tx.objectStore(META).get(userId)))) as { activeId?: string } | undefined
    return m?.activeId ?? null
  }
  async setActive(userId: string, id: string | null) {
    assertUser(userId)
    await this.run(META, 'readwrite', async (tx) => {
      if (id) tx.objectStore(META).put({ userId, activeId: id })
      else tx.objectStore(META).delete(userId)
    })
  }
  async loadConsent(userId: string) {
    assertUser(userId)
    const c = (await this.run(CONSENT, 'readonly', (tx) => req(tx.objectStore(CONSENT).get(userId)))) as MizoConsent | undefined
    return c && c.userId === userId ? c : null
  }
  async saveConsent(c: MizoConsent) {
    assertUser(c.userId)
    await this.run(CONSENT, 'readwrite', async (tx) => void tx.objectStore(CONSENT).put(c))
  }
  async listMemories(userId: string) {
    assertUser(userId)
    const all = await this.run(MEMORIES, 'readonly', (tx) => req(tx.objectStore(MEMORIES).index('userId').getAll(userId)) as Promise<MizoMemory[]>)
    return all.filter((m) => m.userId === userId).sort(byRecent)
  }
  /** Read, check and write in one transaction, so two quick saves can't pass the cap or duplicate. */
  async saveMemory(m: MizoMemory) {
    assertUser(m.userId)
    return this.run(MEMORIES, 'readwrite', async (tx) => {
      const s = tx.objectStore(MEMORIES)
      const own = ((await req(s.index('userId').getAll(m.userId))) as MizoMemory[]).filter((x) => x.userId === m.userId)
      const saved = mergeMemory(own, m, (await req(s.get(m.id))) as MizoMemory | undefined)
      s.put(saved)
      return saved
    })
  }
  async removeMemory(userId: string, id: string) {
    assertUser(userId)
    await this.run(MEMORIES, 'readwrite', async (tx) => {
      const s = tx.objectStore(MEMORIES)
      const existing = (await req(s.get(id))) as MizoMemory | undefined
      if (existing?.userId === userId) s.delete(id)
    })
  }
  async clearMemories(userId: string) {
    assertUser(userId)
    await this.run(MEMORIES, 'readwrite', async (tx) => {
      const s = tx.objectStore(MEMORIES)
      const keys = (await req(s.index('userId').getAllKeys(userId))) as IDBValidKey[]
      for (const k of keys) s.delete(k)
    })
  }
}

export function upgradeChatDb(db: IDBDatabase, tx: IDBTransaction) {
  if (!db.objectStoreNames.contains(LEGACY)) db.createObjectStore(LEGACY, { keyPath: 'userId' })
  if (!db.objectStoreNames.contains(CONSENT)) db.createObjectStore(CONSENT, { keyPath: 'userId' })
  if (!db.objectStoreNames.contains(THREADS)) db.createObjectStore(THREADS, { keyPath: 'id' }).createIndex('userId', 'userId')
  else if (!tx.objectStore(THREADS).indexNames.contains('userId')) tx.objectStore(THREADS).createIndex('userId', 'userId')
  if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'userId' })
  if (!db.objectStoreNames.contains(MEMORIES)) db.createObjectStore(MEMORIES, { keyPath: 'id' }).createIndex('userId', 'userId')
  else if (!tx.objectStore(MEMORIES).indexNames.contains('userId')) tx.objectStore(MEMORIES).createIndex('userId', 'userId')
}

/** Opens the on-device store. Throws if IndexedDB fails, so the screen shows an error instead of a blank history. */
export async function openChatStore(factory: IDBFactory | undefined = typeof indexedDB === 'undefined' ? undefined : indexedDB): Promise<ChatStore> {
  if (!factory) return new MemoryChatStore()
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = factory.open(CHAT_DB_NAME, CHAT_DB_VERSION)
    r.onupgradeneeded = () => upgradeChatDb(r.result, r.transaction!)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  return new IdbChatStore(db)
}

let shared: Promise<ChatStore> | null = null
/** One store per page, opened on first use (only ever from a signed-in Mizo screen). A failed open is retried next time. */
export function sharedChatStore(): Promise<ChatStore> {
  return (shared ??= openChatStore().catch((e) => {
    shared = null
    throw e
  }))
}
