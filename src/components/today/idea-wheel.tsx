
import { useEffect, useRef, useState } from 'react'
import { ChefHat, Footprints, Sparkles, Utensils, type LucideIcon } from 'lucide-react'
import { AppSheet } from '@/components/common/app-sheet'
import { Card } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { Button } from '@/components/ui/button'
import { nextRotation, pickIdea, SEGMENT_DEG, segmentFor, WHEEL_SEGMENTS, type Idea, type IdeaKind } from '@/lib/rewards'

const SPIN_MS = 2400

const KIND_STYLE: Record<IdeaKind, { icon: LucideIcon; color: string }> = {
  food: { icon: Utensils, color: 'var(--energy)' },
  recipe: { icon: ChefHat, color: 'var(--carbs)' },
  activity: { icon: Footprints, color: 'var(--protein)' },
}

const WHEEL_BACKGROUND = `conic-gradient(${WHEEL_SEGMENTS.map(
  (k, i) => `${KIND_STYLE[k].color} ${i * SEGMENT_DEG}deg ${(i + 1) * SEGMENT_DEG}deg`,
).join(', ')})`

export function IdeaWheelCard() {
  const { t } = useStore().i18n
  const [open, setOpen] = useState(false)
  return (
    <Card className="flex items-center justify-between gap-3 p-4" aria-labelledby="wheel-title">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id="wheel-title" className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-muted-foreground" aria-hidden />
          {t('wheel.title')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('wheel.hint')}</p>
      </div>
      <Button variant="outline" onClick={() => setOpen(true)} className="shrink-0">
        {t('wheel.open')}
      </Button>
      <IdeaWheelSheet open={open} onOpenChange={setOpen} />
    </Card>
  )
}

function IdeaWheelSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, locale } = useStore().i18n
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<Idea | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const spin = () => {
    if (spinning) return
    const idea = pickIdea(Math.random, result?.id)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setResult(null)
    setSpinning(true)
    setRotation((r) => nextRotation(r, segmentFor(idea.kind)))
    timer.current = window.setTimeout(
      () => {
        setResult(idea)
        setSpinning(false)
      },
      reduced ? 0 : SPIN_MS,
    )
  }

  const ResultIcon = result ? KIND_STYLE[result.kind].icon : null

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title={t('wheel.title')} description={t('wheel.description')}>
      <div className="flex flex-col items-center gap-5 pt-2">
        <div className="relative size-60 sm:size-64">
          <div
            aria-hidden
            className="absolute start-1/2 -top-1 z-10 size-0 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent border-t-foreground rtl:translate-x-1/2"
          />
          <div
            aria-hidden
            className="size-full rounded-full border-4 border-card shadow-md ring-1 ring-border motion-safe:transition-transform motion-safe:ease-out"
            style={{ background: WHEEL_BACKGROUND, transform: `rotate(${rotation}deg)`, transitionDuration: `${SPIN_MS}ms` }}
          >
            {WHEEL_SEGMENTS.map((kind, i) => {
              const Icon = KIND_STYLE[kind].icon
              return (
                <span
                  key={i}
                  className="absolute inset-0 flex justify-center pt-6"
                  style={{ transform: `rotate(${i * SEGMENT_DEG + SEGMENT_DEG / 2}deg)` }}
                >
                  <Icon className="size-6 text-white drop-shadow" />
                </span>
              )
            })}
            <span className="absolute inset-0 m-auto size-12 rounded-full border-4 border-card bg-background" />
          </div>
        </div>

        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(Object.keys(KIND_STYLE) as IdeaKind[]).map((kind) => (
            <li key={kind} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: KIND_STYLE[kind].color }} aria-hidden />
              {t(`wheel.kind.${kind}`)}
            </li>
          ))}
        </ul>

        <div aria-live="polite" className="flex min-h-20 w-full items-center justify-center">
          {result && ResultIcon ? (
            <div className="flex w-full items-start gap-3 rounded-2xl border bg-accent/50 p-4">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: KIND_STYLE[result.kind].color }}
                aria-hidden
              >
                <ResultIcon className="size-4.5" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">{t(`wheel.kind.${result.kind}`)}</span>
                <p className="text-sm font-semibold text-pretty">{locale === 'ar' ? result.ar : result.en}</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{spinning ? t('wheel.spinning') : t('wheel.prompt')}</p>
          )}
        </div>

        <Button size="lg" className="w-full" onClick={spin} disabled={spinning}>
          <Sparkles aria-hidden />
          {result ? t('wheel.again') : t('wheel.spin')}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t('wheel.note')}</p>
      </div>
    </AppSheet>
  )
}
