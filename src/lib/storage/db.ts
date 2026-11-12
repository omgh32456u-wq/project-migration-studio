import type { AppData, Food, LogEntry, Recipe, SavedMeal, Settings, WeightEntry } from '../types'

export interface StoreRecords {
  foods: Food
  logs: LogEntry
  recipes: Recipe
  savedMeals: SavedMeal
  weights: WeightEntry
}
export type StoreName = keyof StoreRecords
export const STORE_NAMES: StoreName[] = ['foods', 'logs', 'recipes', 'savedMeals', 'weights']

interface MetaRecord {
  key: string
  value: unknown
}

export interface Database {
  readonly persistent: boolean
  getAll<K extends StoreName>(store: K): Promise<StoreRecords[K][]>
  put<K extends StoreName>(store: K, value: StoreRecords[K]): Promise<void>
  putMany<K extends StoreName>(store: K, values: StoreRecords[K][]): Promise<void>
  remove(store: StoreName, id: string): Promise<void>
  getMeta<T>(key: string): Promise<T | undefined>
  setMeta(key: string, value: unknown): Promise<void>
  /** Atomically replaces all user data. */
  replaceAll(data: AppData): Promise<void>
  clearAll(): Promise<void>
}

const DB_NAME = 'track-meals-macros'
const DB_VERSION = 1

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}

export interface OpenDatabaseOptions {
  /** Defaults to the global `indexedDB`. Injectable for tests. */
  factory?: IDBFactory
  /**
   * Called when an upgrade is waiting for another tab to close its connection.
   * The open request stays pending and completes once that tab closes or reloads;
   * we never fall back to memory storage in this case.
   */
  onBlocked?: () => void
  /** Called after this connection closed because another tab needs to upgrade or delete the database. */
  onVersionChange?: () => void
}

function openIdb(factory: IDBFactory, onBlocked?: () => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' })
          if (name === 'logs' || name === 'weights') store.createIndex('date', 'date')
        }
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => onBlocked?.()
  })
}

class IdbDatabase implements Database {
  readonly persistent = true
  constructor(
    private db: IDBDatabase,
    onVersionChange?: () => void,
  ) {
    // Release our connection so the other tab's upgrade can proceed, then tell the app
    // to stop writing: this connection can no longer save anything.
    db.onversionchange = () => {
      db.close()
      onVersionChange?.()
    }
  }

  async getAll<K extends StoreName>(store: K) {
    const tx = this.db.transaction(store, 'readonly')
    return reqToPromise(tx.objectStore(store).getAll() as IDBRequest<StoreRecords[K][]>)
  }
  async put<K extends StoreName>(store: K, value: StoreRecords[K]) {
    const tx = this.db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value)
    await txDone(tx)
  }
  async putMany<K extends StoreName>(store: K, values: StoreRecords[K][]) {
    const tx = this.db.transaction(store, 'readwrite')
    const os = tx.objectStore(store)
    for (const v of values) os.put(v)
    await txDone(tx)
  }
  async remove(store: StoreName, id: string) {
    const tx = this.db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(id)
    await txDone(tx)
  }
  async getMeta<T>(key: string) {
    const tx = this.db.transaction('meta', 'readonly')
    const rec = await reqToPromise(tx.objectStore('meta').get(key) as IDBRequest<MetaRecord | undefined>)
    return rec?.value as T | undefined
  }
  async setMeta(key: string, value: unknown) {
    const tx = this.db.transaction('meta', 'readwrite')
    tx.objectStore('meta').put({ key, value } satisfies MetaRecord)
    await txDone(tx)
  }
  async replaceAll(data: AppData) {
    const tx = this.db.transaction([...STORE_NAMES, 'meta'], 'readwrite')
    for (const name of STORE_NAMES) {
      const os = tx.objectStore(name)
      os.clear()
      for (const rec of data[name]) os.put(rec)
    }
    tx.objectStore('meta').put({ key: 'settings', value: data.settings } satisfies MetaRecord)
    await txDone(tx)
  }
  async clearAll() {
    const tx = this.db.transaction([...STORE_NAMES, 'meta'], 'readwrite')
    for (const name of [...STORE_NAMES, 'meta'] as const) tx.objectStore(name).clear()
    await txDone(tx)
  }
}

/** Used when IndexedDB is unavailable (e.g. some private modes). Data lasts only for the session. */
export class MemoryDatabase implements Database {
  readonly persistent = false
  private stores = new Map<string, Map<string, unknown>>()
  private meta = new Map<string, unknown>()

  private s(name: string) {
    let m = this.stores.get(name)
    if (!m) this.stores.set(name, (m = new Map()))
    return m
  }
  async getAll<K extends StoreName>(store: K) {
    return structuredClone([...this.s(store).values()]) as StoreRecords[K][]
  }
  async put<K extends StoreName>(store: K, value: StoreRecords[K]) {
    this.s(store).set(value.id, structuredClone(value))
  }
  async putMany<K extends StoreName>(store: K, values: StoreRecords[K][]) {
    for (const v of values) await this.put(store, v)
  }
  async remove(store: StoreName, id: string) {
    this.s(store).delete(id)
  }
  async getMeta<T>(key: string) {
    return structuredClone(this.meta.get(key)) as T | undefined
  }
  async setMeta(key: string, value: unknown) {
    this.meta.set(key, structuredClone(value))
  }
  async replaceAll(data: AppData) {
    for (const name of STORE_NAMES) {
      const m = this.s(name)
      m.clear()
      for (const rec of data[name]) m.set(rec.id, structuredClone(rec))
    }
    this.meta.set('settings', structuredClone(data.settings))
  }
  async clearAll() {
    this.stores.clear()
    this.meta.clear()
  }
}

/**
 * Opens persistent storage. Falls back to `MemoryDatabase` (persistent = false) only when
 * IndexedDB is missing or fails to open; the UI must warn the user in that case.
 */
export async function openDatabase(options: OpenDatabaseOptions = {}): Promise<Database> {
  const factory = options.factory ?? (typeof indexedDB === 'undefined' ? undefined : indexedDB)
  if (!factory) return new MemoryDatabase()
  try {
    const db = await openIdb(factory, options.onBlocked)
    return new IdbDatabase(db, options.onVersionChange)
  } catch {
    return new MemoryDatabase()
  }
}

export type { Settings }
