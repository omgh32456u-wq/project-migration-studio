
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Flame, Info } from 'lucide-react'
import { Card, Notice } from '@/components/common/controls'
import { MACRO_KEYS, useNutritionFormat } from '@/components/common/nutrition'
import { ProgressRing } from '@/components/common/progress-ring'
import { useStore } from '@/components/providers/app-store'
import { activeTargets, isIncomplete, KCAL_PER_GRAM, targetEligibility, type Totals } from '@/lib/nutrition'
import type { MacroKey } from '@/lib/types'
import { cn } from '@/lib/utils'

/** On-dark macro fills used inside the hero (full literals so Tailwind can see them). */
const heroFill: Record<MacroKey, string> = { protein: 'bg-hero-protein', carbs: 'bg-hero-carbs', fat: 'bg-hero-fat' }

export function DaySummary({ totals }: { totals: Totals }) {
  const store = useStore()
  const { t } = store.i18n
  const f = useNutritionFormat()
  const targets = activeTargets(store.settings.profile, store.settings.targets)
  const eligible = targetEligibility(store.settings.profile).ok
  const kcal = totals.values.kcal
  const macroKcal = MACRO_KEYS.reduce((sum, k) => sum + totals.values[k] * KCAL_PER_GRAM[k], 0)
  const over = targets ? kcal > targets.kcal : false
  const kcalUnit = t('unit.kcal')

  return (
    <div className="flex flex-col gap-3">
      <Card variant="hero" className="animate-rise overflow-hidden rounded-3xl p-5 sm:p-6" aria-labelledby="summary-title">
        <h2 id="summary-title" className="sr-only">
          {t('summary.title')}
        </h2>

        <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-hero-muted uppercase" aria-hidden>
          <Flame className="size-3.5" />
          {t('nutrient.kcal')}
        </div>

        {targets ? (
          <div className="mt-3 flex items-center gap-5">
            <ProgressRing
              value={kcal}
              max={targets.kcal}
              size={148}
              stroke={9}
              trackClassName="stroke-hero-track"
              arcClassName={over ? 'stroke-hero-carbs' : 'stroke-hero-energy'}
            >
              <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{f.kcal(kcal)}</span>
              <span className="mt-1 text-xs text-hero-muted">
                {kcalUnit} {t('summary.recorded')}
              </span>
            </ProgressRing>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xl leading-snug font-semibold text-balance tabular-nums">
                {over
                  ? t('summary.over', { n: `${f.kcal(kcal - targets.kcal)} ${kcalUnit}` })
                  : t('summary.left', { n: `${f.kcal(targets.kcal - kcal)} ${kcalUnit}` })}
              </p>
              <p className="text-sm text-hero-muted tabular-nums">{t('summary.of', { target: `${f.kcal(targets.kcal)} ${kcalUnit}` })}</p>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{f.kcal(kcal)}</span>
              <span className="text-sm text-hero-muted">
                {kcalUnit} {t('summary.recorded')}
              </span>
            </p>
            {/* No target: show how the recorded energy splits across macros instead of a ring. */}
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-hero-track" aria-hidden>
              {MACRO_KEYS.map((k) => (
                <span
                  key={k}
                  className={cn('h-full transition-[width] duration-700 ease-soft', heroFill[k])}
                  style={{ width: macroKcal > 0 ? `${((totals.values[k] * KCAL_PER_GRAM[k]) / macroKcal) * 100}%` : '0%' }}
                />
              ))}
            </div>
            <p className="text-xs text-hero-muted">
              {t('summary.noTarget')}{' '}
              {eligible && (
                <Link to="/settings" hash="targets" className="font-medium text-hero-foreground underline underline-offset-2">
                  {t('summary.setTarget')}
                </Link>
              )}
            </p>
          </div>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
          {MACRO_KEYS.map((k) => {
            const value = totals.values[k]
            const goal = targets?.grams[k]
            const pct = goal ? Math.min((value / goal) * 100, 100) : macroKcal > 0 ? ((value * KCAL_PER_GRAM[k]) / macroKcal) * 100 : 0
            return (
              <div key={k} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-hero-foreground/[0.07] p-3 ring-1 ring-hero-foreground/10">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-hero-muted">
                  <span className={cn('size-2 shrink-0 rounded-full', heroFill[k])} aria-hidden />
                  <span className="truncate">{t(`nutrient.${k}`)}</span>
                </dt>
                <dd className="flex flex-col gap-2">
                  <span className="text-lg leading-none font-semibold tabular-nums">
                    {f.grams(value)}
                    <span className="text-xs font-normal text-hero-muted">
                      {' '}
                      {goal ? `/ ${store.i18n.fmtNum(goal)} ` : ''}
                      {t('unit.g')}
                    </span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-hero-track" aria-hidden>
                    <span className={cn('block h-full rounded-full transition-[width] duration-700 ease-soft', heroFill[k])} style={{ width: `${pct}%` }} />
                  </span>
                  {totals.missing[k] > 0 && <span className="text-[11px] text-hero-carbs">{t('summary.missing', { n: totals.missing[k] })}</span>}
                </dd>
              </div>
            )
          })}
        </dl>
      </Card>

      {(totals.estimatedCount > 0 || isIncomplete(totals)) && (
        <div className="flex flex-col gap-2">
          {isIncomplete(totals) && (
            <Notice tone="warning" icon={<AlertTriangle />}>
              {t('summary.incomplete')}
            </Notice>
          )}
          {totals.estimatedCount > 0 && (
            <Notice icon={<Info />}>
              {t('summary.estimated', { n: totals.estimatedCount, total: totals.count })}
              {targets && <> {t('summary.targetIsReference')}</>}
            </Notice>
          )}
        </div>
      )}
    </div>
  )
}
