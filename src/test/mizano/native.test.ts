import { afterEach, describe, expect, it, vi } from 'vitest'
import { isNativeApp } from '@/lib/native'

afterEach(() => vi.unstubAllGlobals())

describe('isNativeApp', () => {
  it('is false when there is no window', () => {
    expect(isNativeApp()).toBe(false)
  })

  it('is false in a plain browser', () => {
    vi.stubGlobal('window', {})
    expect(isNativeApp()).toBe(false)
  })

  it('is false when the bridge reports a web platform', () => {
    vi.stubGlobal('window', { Capacitor: { isNativePlatform: () => false } })
    expect(isNativeApp()).toBe(false)
  })

  it('is true when the Capacitor bridge reports a native platform', () => {
    vi.stubGlobal('window', { Capacitor: { isNativePlatform: () => true } })
    expect(isNativeApp()).toBe(true)
  })
})
