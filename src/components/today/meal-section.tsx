
import { BookmarkPlus, Coffee, Moon, Plus, Sandwich, Sun } from 'lucide-react'
import { Badge, Card } from '@/components/common/controls'
import { FoodIcon } from '@/components/common/food-icon'
import { iconForLoggedItem } from '@/lib/food-icons'
import { MACRO_KEYS, macroColor, MacroInline, useNutritionFormat } from '@/components/common/nutrition'
import { useStore } from '@/components/providers/app-store'
import { localName } from '@/lib/display'
import { KCAL_PER_GRAM, sumItems } from '@/lib/nutrition'
import type { LogEntry, MealSlot } from '@/lib/types'
import { cn } from '@/lib/utils'

const ICONS: Record<MealSlot, typeof Sun> = { breakfast: Coffee, lunch: Sun, dinner: Moon, snacks: Sandwich }
/** Each meal gets its own quiet tint so the day reads as a sequence at a glance. */
const TINT: Record<MealSlot, string> = {
  breakfast: 'bg-carbs/15 text-carbs',
  lunch: 'bg-energy/12 text-energy',
  dinner: 'bg-protein/12 text-protein',
  snacks: 'bg-fat/12 text-fat',
}

export function MealSection({
  slot,
  entries,
  onAdd,
  onEdit,
  onSave,
  index = 0,
}: {
  slot: MealSlot
  entries: LogEntry[]
  onAdd: () => void
  onEdit: (e: LogEntry) => void
  onSave: () => void
  /** Position in the list; staggers the entrance animation. */
  index?: number
}) {
  const store = useStore()
  const { t, locale, fmtNum } = store.i18n
  const f = useNutritionFormat()
  const totals = sumItems(entries)
  const Icon = ICONS[slot]
  const name = store.mealName(slot)
  const headingId = `meal-${slot}`
  const filled = entries.length > 0
  const macroKcal = MACRO_KEYS.reduce((sum, k) => sum + totals.values[k] * KCAL_PER_GRAM[k], 0)

  return (
    <Card
      aria-labelledby={headingId}
      className={cn('animate-rise overflow-hidden', !filled && 'border-dashed bg-card/50 shadow-none')}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', TINT[slot])} aria-hidden>
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 id={headingId} className="truncate text-sm font-semibold">
            {name}
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filled ? `${f.kcal(totals.values.kcal)} ${t('unit.kcal')} · ${t('today.items', { n: entries.length })}` : t('meal.empty')}
          </span>
        </div>
        {filled && (
          <button
            type="button"
            onClick={onSave}
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            aria-label={`${t('meal.saveAs')}: ${name}`}
            title={t('meal.saveAs')}
          >
            <BookmarkPlus className="size-5" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
          aria-label={t('today.addTo', { meal: name })}
        >
          <Plus className="size-5" aria-hidden />
        </button>
      </div>

      {filled && (
        <>
          {/* Macro split of this meal by energy; purely decorative, the numbers are in each row. */}
          {macroKcal > 0 && (
            <div className="mx-4 flex h-1 gap-px overflow-hidden rounded-full bg-muted" aria-hidden>
              {MACRO_KEYS.map((k) => (
                <span key={k} className={cn('h-full', macroColor[k])} style={{ width: `${((totals.values[k] * KCAL_PER_GRAM[k]) / macroKcal) * 100}%` }} />
              ))}
            </div>
          )}
          <ul className="mt-2 border-t">
            {entries.map((e) => (
              <li key={e.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => onEdit(e)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-accent/40 focus-visible:bg-accent/60 focus-visible:outline-none active:bg-accent/60"
                >
                  <FoodIcon icon={iconForLoggedItem(e, store.foodsById)} className="size-10 rounded-xl" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{localName(e, locale)}</span>
                      {e.estimated && (
                        <Badge tone="warning" title={t('source.estimate.hint')}>
                          ≈
                          <span className="sr-only">{t('entry.estimatedBadge')}</span>
                        </Badge>
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground tabular-nums">
                      <span>
                        {e.unitKind === 'g'
                          ? `${fmtNum(e.amount, 1)} ${t('unit.g')}`
                          : `${fmtNum(e.amount, 2)} × ${locale === 'ar' ? e.unitLabelAr : e.unitLabelEn} (${fmtNum(e.grams, 0)} ${t('unit.g')})`}
                      </span>
                      <MacroInline n={e.nutrients} />
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {f.kcal(e.nutrients.kcal)}
                    <span className="ms-1 text-xs font-normal text-muted-foreground">{t('unit.kcal')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
