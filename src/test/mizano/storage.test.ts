import { describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '@/lib/defaults'
import { openDatabase } from '@/lib/storage/db'
import { createSerialQueue, createSerialUpdater } from '@/lib/storage/serial'
import type { Settings } from '@/lib/types'

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('serial settings updates (C2)', () => {
  it('applies rapid consecutive updates on top of each other', async () => {
    const writes: Settings[] = []
    const updater = createSerialUpdater<Settings>(defaultSettings(), async (next) => {
      await new Promise((r) => setTimeout(r, 5))
      writes.push(next)
    })
    const toggle = (id: string) => (s: Settings) => ({
      ...s,
      favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
    })

    await Promise.all([updater.update(toggle('a')), updater.update(toggle('b')), updater.update(toggle('c'))])

    expect(updater.current().favorites).toEqual(['a', 'b', 'c'])
    expect(writes.map((w) => w.favorites)).toEqual([['a'], ['a', 'b'], ['a', 'b', 'c']])
  })

  it('toggling twice quickly returns to the original state', async () => {
    const updater = createSerialUpdater<Settings>(defaultSettings(), async () => undefined)
    const toggle = (s: Settings) => ({ ...s, favorites: s.favorites.includes('x') ? [] : ['x'] })
    await Promise.all([updater.update(toggle), updater.update(toggle)])
    expect(updater.current().favorites).toEqual([])
  })

  it('does not advance the value when saving fails, and later updates still run', async () => {
    let fail = true
    const updater = createSerialUpdater<number>(0, async () => {
      if (fail) throw new Error('write failed')
    })
    await expect(updater.update((n) => n + 1)).rejects.toThrow('write failed')
    expect(updater.current()).toBe(0)
    fail = false
    await expect(updater.update((n) => n + 1)).resolves.toBe(1)
  })

  it('reset replaces the base value used by the next update', async () => {
    const updater = createSerialUpdater<number>(0, async () => undefined)
    updater.reset(10)
    await expect(updater.update((n) => n + 1)).resolves.toBe(11)
  })

  it('queue runs tasks strictly in order', async () => {
    const enqueue = createSerialQueue()
    const order: number[] = []
    await Promise.all([
      enqueue(async () => {
        await new Promise((r) => setTimeout(r, 10))
        order.push(1)
      }),
      enqueue(async () => {
        order.push(2)
      }),
    ])
    expect(order).toEqual([1, 2])
  })
})

/** Minimal stand-in for IDBFactory: lets each test drive the open request's events. */
function fakeFactory() {
  const db = {
    objectStoreNames: { contains: () => true },
    close: vi.fn(),
    onversionchange: null as null | (() => void),
  }
  const req = {
    result: db,
    error: new Error('open failed'),
    onsuccess: null as null | (() => void),
    onerror: null as null | (() => void),
    onblocked: null as null | (() => void),
    onupgradeneeded: null as null | (() => void),
  }
  const open = vi.fn((name: string, version: number) => {
    void name
    void version
    return req
  })
  return { factory: { open } as unknown as IDBFactory, open, req, db }
}

describe('IndexedDB open and version changes (C3)', () => {
  it('keeps the existing database name and version', async () => {
    const f = fakeFactory()
    const pending = openDatabase({ factory: f.factory })
    f.req.onsuccess?.()
    await pending
    expect(f.open).toHaveBeenCalledWith('track-meals-macros', 1)
  })

  it('waits on a blocked upgrade instead of silently falling back to memory', async () => {
    const f = fakeFactory()
    const onBlocked = vi.fn()
    let settled = false
    const pending = openDatabase({ factory: f.factory, onBlocked }).then((d) => {
      settled = true
      return d
    })

    f.req.onblocked?.()
    await tick()
    expect(onBlocked).toHaveBeenCalledOnce()
    expect(settled).toBe(false)

    f.req.onsuccess?.()
    const db = await pending
    expect(db.persistent).toBe(true)
  })

  it('closes the connection and reports when another tab needs to upgrade', async () => {
    const f = fakeFactory()
    const onVersionChange = vi.fn()
    const pending = openDatabase({ factory: f.factory, onVersionChange })
    f.req.onsuccess?.()
    await pending

    expect(f.db.onversionchange).toBeTypeOf('function')
    f.db.onversionchange?.()
    expect(f.db.close).toHaveBeenCalledOnce()
    expect(onVersionChange).toHaveBeenCalledOnce()
  })

  it('falls back to non-persistent memory storage (flagged for the warning banner) when opening fails', async () => {
    const f = fakeFactory()
    const pending = openDatabase({ factory: f.factory })
    f.req.onerror?.()
    const db = await pending
    expect(db.persistent).toBe(false)
  })
})
