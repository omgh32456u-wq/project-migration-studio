
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { BrandMark } from '@/components/common/brand-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStore } from '@/components/providers/app-store'
import { usePrefersReducedMotion } from './onboarding-growths'
import { armOnceOnGesture, playOpeningTone, stopOpeningTone } from './onboarding-sound'

/** One-time brand reveal with an optional, persistent opening-sound control. */
export function OnboardingIntro() {
  const reduced = usePrefersReducedMotion()
  const { t } = useStore().i18n
  const [phase, setPhase] = useState<'reveal' | 'settle' | 'gone'>(reduced ? 'gone' : 'reveal')
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(muted)
  const playedRef = useRef(false)
  mutedRef.current = muted

  useEffect(() => {
    if (reduced) {
      setPhase('gone')
      return
    }
    const settle = window.setTimeout(() => setPhase('settle'), 520)
    const done = window.setTimeout(() => setPhase('gone'), 900)
    return () => {
      window.clearTimeout(settle)
      window.clearTimeout(done)
    }
  }, [reduced])

  useEffect(() => {
    if (reduced) return
    return armOnceOnGesture((event) => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-onboarding-sound-toggle]')) return
      if (mutedRef.current || playedRef.current) return
      playedRef.current = true
      playOpeningTone()
    })
  }, [reduced])

  const toggleSound = () => {
    const nextMuted = !mutedRef.current
    mutedRef.current = nextMuted
    setMuted(nextMuted)
    if (nextMuted) {
      stopOpeningTone()
    } else if (!reduced) {
      playedRef.current = true
      playOpeningTone()
    }
  }

  return (
    <>
      {phase !== 'gone' && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div
            aria-hidden
            className={cn(
              'absolute inset-0 bg-background transition-opacity duration-500',
              phase === 'settle' ? 'opacity-0' : 'opacity-100',
            )}
          />
          <div
            aria-hidden
            style={{
              transition: 'opacity 480ms var(--ease-soft), transform 520ms var(--ease-soft)',
              opacity: phase === 'settle' ? 0 : 1,
              transform: phase === 'settle' ? 'scale(1.18)' : 'scale(1)',
            }}
            className="relative flex size-40 items-center justify-center rounded-full border border-primary/25 bg-card shadow-lift md:size-44"
          >
            <BrandMark className="size-20 md:size-22" />
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-[60]">
        <Button
          type="button"
          variant="outline"
          size="icon"
          data-onboarding-sound-toggle
          className="pointer-events-auto rounded-full bg-card/95 shadow-soft backdrop-blur"
          aria-label={t(muted ? 'intro.unmute' : 'intro.mute')}
          aria-pressed={muted}
          title={t(muted ? 'intro.unmute' : 'intro.mute')}
          onClick={toggleSound}
        >
          {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
        </Button>
      </div>
    </>
  )
}
