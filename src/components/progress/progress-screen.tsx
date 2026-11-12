
import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChartColumn, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Card, EmptyState, Notice, PageHeader, Segmented } from '@/components/common/controls'
import { MACRO_KEYS, macroColor, useNutritionFormat } from '@/components/common/nutrition'
import { useStore } from '@/components/providers/app-store'
import { addDays, addMonths, dateRange, daysInMonth, startOfMonth, startOfWeek } from '@/lib/dates'
import { weekStartFor } from '@/lib/i18n'
import { activeTargets, KCAL_PER_GRAM, sumItems, type Totals } from '@/lib/nutrition'
import { NUTRIENT_KEYS, type NutrientKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import { WeightCard } from './weight-card'

type Period = 'week' | 'month'

interface DayStat {
  date: string
  totals: Totals
}

export function ProgressScreen() {
  const store = useStore()
  const navigate = useNavigate()
  const { t, locale, dir, fmtDate, fmtNum } = store.i18n
  const f = useNutritionFormat()
  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState(store.today)

  const days = useMemo(() => {
    if (period === 'week') return dateRange(startOfWeek(anchor, weekStartFor(locale)), 7)
    const start = startOfMonth(anchor)
    return dateRange(start, daysInMonth(start))
  }, [anchor, period, locale])

  const stats: DayStat[] = useMemo(() => days.map((date) => ({ date, totals: sumItems(store.logsByDate.get(date) ?? []) })), [days, store.logsByDate])
  const logged = stats.filter((s) => s.totals.count > 0)
  const averages = useMemo(() => {
    const out = { kcal: 0, protein: 0, carbs: 0, fat: 0 } as Record<NutrientKey, number>
    if (logged.length === 0) return out
    for (const k of NUTRIENT_KEYS) out[k] = logged.reduce((sum, s) => sum + s.totals.values[k], 0) / logged.length
    return out
  }, [logged])
  const anyEstimated = logged.some((s) => s.totals.estimatedCount > 0)
  const targets = activeTargets(store.settings.profile, store.settings.targets)

  const lastDay = days[days.length - 1]
  const canGoNext = lastDay < store.today
  const shift = (dirSign: 1 | -1) => setAnchor((a) => (period === 'week' ? addDays(a, 7 * dirSign) : addMonths(a, dirSign)))
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  const rangeLabel =
    period === 'week'
      ? `${fmtDate(days[0], { day: 'numeric', month: 'short' })} – ${fmtDate(lastDay, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : fmtDate(days[0], { month: 'long', year: 'numeric' })

  const openDay = (date: string) => {
    store.setSelectedDate(date)
    navigate({ to: '/' })
  }

  const macroKcal = MACRO_KEYS.reduce((sum, k) => sum + averages[k] * KCAL_PER_GRAM[k], 0)

  return (
    <div className="flex flex-col">
      <PageHeader title={t('progress.title')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            label={t('progress.title')}
            value={period}
            onChange={setPeriod}
            className="sm:w-56"
            options={[
              { value: 'week', label: t('progress.week') },
              { value: 'month', label: t('progress.month') },
            ]}
          />
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shift(-1)} aria-label={t('progress.prev')} className="flex size-11 items-center justify-center rounded-xl hover:bg-muted">
              <PrevIcon className="size-5" aria-hidden />
            </button>
            <span className="min-w-40 text-center text-sm font-medium tabular-nums" aria-live="polite">
              {rangeLabel}
            </span>
            <button
              type="button"
              onClick={() => shift(1)}
              disabled={!canGoNext}
              aria-label={t('progress.next')}
              className="flex size-11 items-center justify-center rounded-xl hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
              <NextIcon className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-5">
        {logged.length === 0 ? (
          <Card>
            <EmptyState icon={<ChartColumn className="size-6" />} title={t('progress.empty.title')} body={t('progress.empty.body')} />
          </Card>
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <Card className="flex flex-col gap-4 p-5" aria-labelledby="avg-title">
                <div className="flex flex-col gap-0.5">
                  <h2 id="avg-title" className="text-sm font-semibold">
                    {t('progress.avg')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t('progress.daysLogged', { n: logged.length, total: days.length })} · {t('progress.avgHint')}
                  </p>
                </div>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight tabular-nums">{f.kcal(averages.kcal)}</span>
                  <span className="text-sm text-muted-foreground">{t('unit.kcal')}</span>
                  {targets && (
                    <span className="ms-auto text-xs text-muted-foreground tabular-nums">
                      {t('progress.target')}: {f.kcal(targets.kcal)}
                    </span>
                  )}
                </p>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{t('progress.macroSplit')}</span>
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
                    {macroKcal > 0 &&
                      MACRO_KEYS.map((k) => <span key={k} className={cn('h-full', macroColor[k])} style={{ width: `${((averages[k] * KCAL_PER_GRAM[k]) / macroKcal) * 100}%` }} />)}
                  </div>
                  <dl className="grid grid-cols-3 gap-2">
                    {MACRO_KEYS.map((k) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={cn('size-2 rounded-full', macroColor[k])} aria-hidden />
                          {t(`nutrient.${k}`)}
                        </dt>
                        <dd className="text-sm font-semibold tabular-nums">
                          {f.grams(averages[k])} {t('unit.g')}
                          <span className="ms-1 text-xs font-normal text-muted-foreground">
                            {macroKcal > 0 ? `${fmtNum(((averages[k] * KCAL_PER_GRAM[k]) / macroKcal) * 100)}%` : ''}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {anyEstimated && <Notice icon={<Info />}>{t('progress.estimatedNote')}</Notice>}
              </Card>

              <EnergyChart stats={stats} target={targets?.kcal ?? null} period={period} onOpenDay={openDay} />
            </div>

            <Card className="p-0">
              <details className="group">
                <summary className="flex min-h-12 cursor-pointer items-center px-5 text-sm font-medium marker:content-none">{t('progress.table')}</summary>
                <div className="overflow-x-auto border-t">
                  <table className="w-full text-sm tabular-nums">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-5 py-2 text-start font-medium">
                          {t('progress.day')}
                        </th>
                        <th scope="col" className="px-3 py-2 text-end font-medium">
                          {t('unit.kcal')}
                        </th>
                        {MACRO_KEYS.map((k) => (
                          <th key={k} scope="col" className="px-3 py-2 text-end font-medium">
                            {t(`nutrient.${k}`)}
                          </th>
                        ))}
                        <th scope="col" className="px-5 py-2 text-end font-medium">
                          {t('progress.entries')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logged.map((s) => (
                        <tr key={s.date} className="border-t">
                          <th scope="row" className="px-5 py-2 text-start font-medium">
                            <button type="button" onClick={() => openDay(s.date)} className="text-primary underline-offset-2 hover:underline">
                              {fmtDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </button>
                          </th>
                          <td className="px-3 py-2 text-end">{f.kcal(s.totals.values.kcal)}</td>
                          {MACRO_KEYS.map((k) => (
                            <td key={k} className="px-3 py-2 text-end">
                              {f.grams(s.totals.values[k])}
                            </td>
                          ))}
                          <td className="px-5 py-2 text-end">{fmtNum(s.totals.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Card>
          </>
        )}

        <WeightCard />

        <p className="text-xs leading-relaxed text-muted-foreground">{t('progress.disclaimer')}</p>
      </div>
    </div>
  )
}

function EnergyChart({ stats, target, period, onOpenDay }: { stats: DayStat[]; target: number | null; period: Period; onOpenDay: (d: string) => void }) {
  const store = useStore()
  const { t, fmtDate } = store.i18n
  const f = useNutritionFormat()
  const max = Math.max(target ?? 0, ...stats.map((s) => s.totals.values.kcal), 1)
  const targetPct = target ? (target / max) * 100 : null

  return (
    <Card className="flex flex-col gap-4 p-5" aria-labelledby="chart-title">
      <h2 id="chart-title" className="text-sm font-semibold">
        {t('progress.chart')}
      </h2>
      <div className="relative h-48">
        {targetPct !== null && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/50" style={{ bottom: `${targetPct}%` }} aria-hidden>
            <span className="absolute -top-4 end-0 text-[10px] text-muted-foreground">{t('progress.target')}</span>
          </div>
        )}
        <ul className={cn('flex h-full items-end', period === 'week' ? 'gap-2' : 'gap-0.5')}>
          {stats.map((s) => {
            const kcal = s.totals.values.kcal
            const pct = (kcal / max) * 100
            const label = `${fmtDate(s.date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${f.kcal(kcal)} ${t('unit.kcal')}`
            const isToday = s.date === store.today
            return (
              <li key={s.date} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <button
                  type="button"
                  onClick={() => onOpenDay(s.date)}
                  title={label}
                  aria-label={`${t('progress.viewDay')} – ${label}`}
                  className="group flex h-full w-full flex-col justify-end rounded-md focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span
                    className={cn(
                      'block w-full rounded-t-md transition-colors',
                      s.totals.count === 0 ? 'bg-muted' : target && kcal > target ? 'bg-carbs' : 'bg-energy',
                      'group-hover:opacity-80',
                    )}
                    style={{ height: s.totals.count === 0 ? '4px' : `${Math.max(pct, 2)}%` }}
                  />
                </button>
                <span className={cn('mt-1 truncate text-center text-[10px] tabular-nums', isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')} aria-hidden>
                  {period === 'week' ? fmtDate(s.date, { weekday: 'narrow' }) : fmtDate(s.date, { day: 'numeric' })}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}
