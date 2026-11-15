
import { useState } from 'react'
import { Calculator, Info, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Field, Notice, NumberInput } from '@/components/common/controls'
import { MACRO_KEYS, macroColor } from '@/components/common/nutrition'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { estimateMaintenance, isTeen, macroGramTargets, minTargetKcal, parseLocaleNumber, targetEligibility, TARGET_LIMITS, validateTargets } from '@/lib/nutrition'
import type { MacroKey, Targets } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SettingsSection } from './settings-section'

export function TargetsCard() {
  const store = useStore()
  const { t } = store.i18n
  const { profile, targets } = store.settings
  const elig = targetEligibility(profile)

  return (
    <SettingsSection id="targets" title={t('targets.title')} badge={t('targets.optional')}>
      {!elig.ok ? (
        <Notice icon={<ShieldCheck />}>{elig.reason === 'teen_details' ? t('targets.teenDetails') : t('targets.ageUnknown')}</Notice>
      ) : (
        <TargetsForm key={`${targets.kcal}:${targets.proteinPct}:${targets.carbsPct}:${targets.fatPct}:${targets.enabled}`} initial={targets} />
      )}
    </SettingsSection>
  )
}

function TargetsForm({ initial }: { initial: Targets }) {
  const store = useStore()
  const run = useAction()
  const { t, fmtNum } = store.i18n
  const [enabled, setEnabled] = useState(initial.enabled)
  const [kcal, setKcal] = useState(initial.kcal !== null ? String(initial.kcal) : '')
  const [pct, setPct] = useState<Record<MacroKey, string>>({
    protein: String(initial.proteinPct),
    carbs: String(initial.carbsPct),
    fat: String(initial.fatPct),
  })
  const [error, setError] = useState<string | null>(null)
  const estimate = estimateMaintenance(store.settings.profile)
  const teen = isTeen(store.settings.profile)
  const floor = minTargetKcal(store.settings.profile)
  const kcalErrorText = (msg: string) => msg === t('targets.error.kcal_range') || msg === t('targets.error.teen_floor', { n: fmtNum(floor) })

  const parsed = {
    kcal: parseLocaleNumber(kcal),
    proteinPct: parseLocaleNumber(pct.protein) ?? NaN,
    carbsPct: parseLocaleNumber(pct.carbs) ?? NaN,
    fatPct: parseLocaleNumber(pct.fat) ?? NaN,
  }
  const sum = [parsed.proteinPct, parsed.carbsPct, parsed.fatPct].reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
  const grams = parsed.kcal !== null && Number.isFinite(sum) ? macroGramTargets(parsed) : null

  const save = () => {
    if (enabled) {
      const err = validateTargets(parsed, floor)
      if (err) return setError(err === 'teen_floor' ? t('targets.error.teen_floor', { n: fmtNum(floor) }) : t(`targets.error.${err}`))
    }
    setError(null)
    const next: Targets = {
      enabled,
      kcal: parsed.kcal !== null ? Math.round(parsed.kcal) : null,
      proteinPct: Number.isFinite(parsed.proteinPct) ? parsed.proteinPct : initial.proteinPct,
      carbsPct: Number.isFinite(parsed.carbsPct) ? parsed.carbsPct : initial.carbsPct,
      fatPct: Number.isFinite(parsed.fatPct) ? parsed.fatPct : initial.fatPct,
    }
    void run(() => store.updateSettings((s) => ({ ...s, targets: next })), { success: t('targets.saved') })
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium">
        {t('targets.enable')}
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      {enabled && (
        <>
          <Field label={t('targets.kcal')} error={error && kcalErrorText(error) ? error : null}>
            {({ id, describedBy, invalid }) => (
              <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={kcal} onChange={(e) => setKcal(e.target.value)} className="w-40" />
            )}
          </Field>

          <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="size-4 text-muted-foreground" aria-hidden />
              {t('targets.estimateTitle')}
            </span>
            {estimate.ok ? (
              <>
                <p className="text-lg font-semibold tabular-nums">{t('targets.estimateValue', { n: fmtNum(estimate.maintenance) })}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{t(estimate.method === 'teen_eer' ? 'targets.estimateTeen' : 'targets.estimateAssumptions')}</p>
                {teen && <p className="text-xs leading-relaxed text-muted-foreground">{t('targets.teenNote')}</p>}
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  onClick={() => setKcal(String(Math.min(TARGET_LIMITS.maxKcal, Math.max(TARGET_LIMITS.minKcal, estimate.maintenance))))}
                >
                  {t('targets.estimate')}
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t('targets.estimateMissing')}</p>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">{t('targets.split')}</legend>
            <div className="grid grid-cols-3 gap-3">
              {MACRO_KEYS.map((k) => (
                <div key={k} className="flex flex-col gap-1">
                  <label htmlFor={`pct-${k}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn('size-2 rounded-full', macroColor[k])} aria-hidden />
                    {t(`nutrient.${k}`)}
                  </label>
                  <NumberInput id={`pct-${k}`} value={pct[k]} onChange={(e) => setPct((p) => ({ ...p, [k]: e.target.value }))} />
                  {grams && <span className="text-[11px] text-muted-foreground tabular-nums">{t('targets.grams', { g: fmtNum(grams[k]) })}</span>}
                </div>
              ))}
            </div>
            <p className={cn('text-xs tabular-nums', Math.round(sum) === 100 ? 'text-muted-foreground' : 'font-medium text-destructive')}>
              {t('targets.sum', { n: fmtNum(sum, 1) })}
            </p>
            <p className="text-xs text-muted-foreground">{t(teen ? 'targets.amdrTeen' : 'targets.amdr')}</p>
          </fieldset>
        </>
      )}

      {error && !kcalErrorText(error) && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      <Notice icon={<Info />}>{t('targets.disclaimer')}</Notice>
      <Button type="submit" size="lg" className="self-start">
        {t('common.save')}
      </Button>
    </form>
  )
}
