type CapacitorBridge = { isNativePlatform?: () => boolean }

/**
 * True only inside the Capacitor Android shell. The native bridge injects `window.Capacitor` before page
 * scripts run, so no @capacitor/core import (and no extra bundle weight) is needed for the check.
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

/**
 * Saves a text file by handing it to the Android share sheet (Drive, Files, mail, ...).
 * Android WebView ignores blob/anchor downloads, so the web `downloadFile` path silently does nothing there.
 * Plugins are imported lazily so the web build never loads them.
 */
export async function shareTextFile(filename: string, content: string): Promise<void> {
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
  const { uri } = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 })
  await Share.share({ title: filename, dialogTitle: filename, url: uri })
}
