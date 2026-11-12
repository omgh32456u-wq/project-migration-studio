
/** Subtle original opening tone, synthesized with Web Audio (no asset/dependency). */

let audioCtx: AudioContext | null = null
let activeMaster: GainNode | null = null

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    audioCtx = new AC()
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

/** Gentle two-note opening chime (~1s, peak gain 0.12). */
export function playOpeningTone() {
  const ctx = ensureCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const master = ctx.createGain()
  activeMaster = master
  master.gain.setValueAtTime(0, now)
  master.gain.linearRampToValueAtTime(0.12, now + 0.08)
  master.gain.linearRampToValueAtTime(0, now + 1.1)
  master.connect(ctx.destination)

  const note = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now + start)
    gain.gain.setValueAtTime(0, now + start)
    gain.gain.linearRampToValueAtTime(1, now + start + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
    osc.connect(gain)
    gain.connect(master)
    osc.start(now + start)
    osc.stop(now + start + dur + 0.05)
  }
  note(494, 0, 0.7)
  note(659, 0.22, 0.9)
}

/** Fade out the currently playing opening tone, if any. */
export function stopOpeningTone() {
  if (!activeMaster || !audioCtx) return
  const now = audioCtx.currentTime
  activeMaster.gain.cancelScheduledValues(now)
  activeMaster.gain.setTargetAtTime(0, now, 0.015)
  activeMaster = null
}

/** Arm a one-time pointer gesture; pass its event so callers can exclude controls. */
export function armOnceOnGesture(cb: (event: PointerEvent) => void): () => void {
  const handler = (event: PointerEvent) => {
    window.removeEventListener('pointerdown', handler)
    cb(event)
  }
  window.addEventListener('pointerdown', handler, { passive: true })
  return () => window.removeEventListener('pointerdown', handler)
}
