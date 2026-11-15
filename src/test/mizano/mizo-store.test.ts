import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { CHAT_DB_NAME, legacyConversationId, openChatStore, type LegacyMizoConversation } from '@/lib/mizo/chat-store'

const msgs = (n: number, p: string) =>
  Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', text: `${p} message ${i}`, createdAt: `2026-11-1${i % 9}T00:00:00.000Z` }))

/** Builds the real v2 layout: one chat per account keyed by userId, plus consent. */
async function v2(factory: IDBFactory, legacy: LegacyMizoConversation[], consent: object[]) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = factory.open(CHAT_DB_NAME, 2)
    r.onupgradeneeded = () => {
      r.result.createObjectStore('conversations', { keyPath: 'userId' })
      r.result.createObjectStore('consent', { keyPath: 'userId' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  const tx = db.transaction(['conversations', 'consent'], 'readwrite')
  for (const l of legacy) tx.objectStore('conversations').put(l)
  for (const c of consent) tx.objectStore('consent').put(c)
  await new Promise((r) => (tx.oncomplete = r))
  db.close()
}

async function legacyLeft(factory: IDBFactory, userId: string) {
  const db = await new Promise<IDBDatabase>((resolve) => {
    const r = factory.open(CHAT_DB_NAME)
    r.onsuccess = () => resolve(r.result)
  })
  const got = await new Promise((resolve) => {
    const g = db.transaction('conversations').objectStore('conversations').get(userId)
    g.onsuccess = () => resolve(g.result)
  })
  db.close()
  return got
}

describe('Mizo chat storage upgrade (v2 to v3)', () => {
  it('moves each account’s old chat intact, keeps consent, and never mixes accounts', async () => {
    const f = new IDBFactory()
    const alice = msgs(25, 'alice')
    await v2(f, [{ userId: 'alice', messages: alice, updatedAt: '2026-11-14T09:00:00.000Z' }, { userId: 'bob', messages: msgs(3, 'bob'), updatedAt: '2026-11-14T08:00:00.000Z' }], [{ userId: 'alice', version: 1, granted: true, updatedAt: 'x' }])
    const s = await openChatStore(f)
    const list = await s.list('alice')
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: legacyConversationId('alice'), userId: 'alice', title: 'alice message 0', kind: 'chat' })
    expect(list[0].messages).toEqual(alice)
    expect(await s.getActive('alice')).toBe(legacyConversationId('alice'))
    expect(await s.loadConsent('alice')).toMatchObject({ granted: true, version: 1 })
    expect(await legacyLeft(f, 'alice')).toBeUndefined()
    // Bob's old chat waits until Bob opens Mizo, and is never visible to Alice.
    expect(await legacyLeft(f, 'bob')).toBeDefined()
    expect((await s.list('bob'))[0].messages.map((m) => m.text)).toEqual(['bob message 0', 'bob message 1', 'bob message 2'])
    expect(await s.list('carol')).toEqual([])
  })

  it('is safe to repeat and finishes a half-done upgrade without duplicating', async () => {
    const f = new IDBFactory()
    const old = { userId: 'u', messages: msgs(4, 'u'), updatedAt: '2026-11-14T00:00:00.000Z' }
    await v2(f, [old], [])
    const first = await openChatStore(f)
    await first.list('u')
    // Simulate an interruption after the copy but before the old record was removed.
    await v2Reinsert(f, old)
    const again = await openChatStore(f)
    const list = await again.list('u')
    expect(list).toHaveLength(1)
    expect(list[0].messages).toEqual(old.messages)
    expect(await legacyLeft(f, 'u')).toBeUndefined()
    expect(await (await openChatStore(f)).list('u')).toHaveLength(1)
  })

  it('an account with no old chat starts empty, and empty old records are just cleared', async () => {
    const f = new IDBFactory()
    await v2(f, [{ userId: 'e', messages: [], updatedAt: 'x' }], [])
    const s = await openChatStore(f)
    expect(await s.list('e')).toEqual([])
    expect(await s.list('nobody')).toEqual([])
    expect(await s.getActive('nobody')).toBeNull()
  })
})

async function v2Reinsert(f: IDBFactory, old: LegacyMizoConversation) {
  const db = await new Promise<IDBDatabase>((resolve) => {
    const r = f.open(CHAT_DB_NAME)
    r.onsuccess = () => resolve(r.result)
  })
  const tx = db.transaction('conversations', 'readwrite')
  tx.objectStore('conversations').put(old)
  await new Promise((r) => (tx.oncomplete = r))
  db.close()
}
