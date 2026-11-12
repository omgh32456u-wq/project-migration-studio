
import { useEffect } from 'react'
import { isNativeApp } from '@/lib/native'

/** Registers the service worker in production only, so development HMR is never cached. Skipped inside the Android app, which already ships its assets locally. */
export function PwaRegister() {
  useEffect(() => {
    if (!import.meta.env.PROD || window.self !== window.top || !('serviceWorker' in navigator) || isNativeApp()) return
    const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])
  return null
}
