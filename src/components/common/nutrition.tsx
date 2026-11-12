
import { useCallback } from 'react'
import { useStore } from '@/components/providers/app-store'
import type { MacroKey, Nutrients } from '@/lib/types'
import { cn } from '@/lib/utils'

export const MACRO_KEYS: MacroKey[] = ['protein', 'carbs', 'fat']
export const macroColor: Record<MacroKey, string> = { protein: 'bg-protein', carbs: 'bg-carbs', fat: 'bg-fat' }

export function useNutritionFormat() {
  const { i18n } = useStore()
  const kcal = useCallback((v: number | null) => (v === null ? '—' : i18n.fmtNum(Math.round(v))), [i18n])
  const grams = useCallback((v: number | null) => (v === null ? '—' : i18n.fmtNum(v, v < 10 ? 1 : 0)), [i18n])
  return { kcal, grams }
}

export function MacroInline({ n, className }: { n: Nutrients; className?: string }) {
  const { i18n } = useStore()
  const f = useNutritionFormat()
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground tabular-nums', className)}>
      {MACRO_KEYS.map((k) => (
        <span key={k} className="inline-flex items-center gap-1">
          <span className={cn('size-1.5 rounded-full', macroColor[k])} aria-hidden />
          <span className="sr-only">{i18n.t(`nutrient.${k}`)}</span>
          <span aria-hidden>{i18n.t(`nutrient.short.${k}`)}</span>
          {f.grams(n[k])}
        </span>
      ))}
    </span>
  )
}

export function NutrientGrid({ n, className }: { n: Nutrients; className?: string }) {
  const { i18n } = useStore()
  const f = useNutritionFormat()
  return (
    <dl className={cn('grid grid-cols-2 gap-2 min-[400px]:grid-cols-4', className)}>
      <div className="flex flex-col gap-0.5 rounded-xl bg-accent px-3 py-2.5">
        <dt className="text-[11px] font-medium text-accent-foreground/80">{i18n.t('nutrient.kcal')}</dt>
        <dd className="text-lg font-semibold tabular-nums text-accent-foreground">
          {f.kcal(n.kcal)} <span className="text-[11px] font-medium">{i18n.t('unit.kcal')}</span>
        </dd>
      </div>
      {MACRO_KEYS.map((k) => (
        <div key={k} className="flex flex-col gap-0.5 rounded-xl bg-muted px-3 py-2.5">
          <dt className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <span className={cn('size-1.5 rounded-full', macroColor[k])} aria-hidden />
            {i18n.t(`nutrient.${k}`)}
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {f.grams(n[k])} <span className="text-[11px] font-medium text-muted-foreground">{i18n.t('unit.g')}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
