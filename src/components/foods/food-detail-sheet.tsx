
import { useState } from 'react'
import { Info, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { AppSheet } from '@/components/common/app-sheet'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Badge, Notice } from '@/components/common/controls'
import { NutrientGrid, useNutritionFormat } from '@/components/common/nutrition'
import { Button } from '@/components/ui/button'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { localName, secondaryName, servingLabel } from '@/lib/display'
import { scaleNutrients } from '@/lib/nutrition'
import type { Food } from '@/lib/types'
import { cn } from '@/lib/utils'

export function FoodDetailSheet({
  food,
  onOpenChange,
  onLog,
  onEdit,
}: {
  food: Food | null
  onOpenChange: (o: boolean) => void
  onLog: (f: Food) => void
  onEdit: (f: Food) => void
}) {
  const store = useStore()
  const run = useAction()
  const { t, locale, fmtNum } = store.i18n
  const f = useNutritionFormat()
  const [confirm, setConfirm] = useState(false)
  const fav = food ? store.settings.favorites.includes(food.id) : false

  return (
    <>
      <AppSheet open={!!food} onOpenChange={onOpenChange} title={t('food.details')}>
        {food && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="text-lg font-semibold leading-tight">{localName(food, locale)}</h3>
                {secondaryName(food, locale) && <p className="text-sm text-muted-foreground">{secondaryName(food, locale)}</p>}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge>{t(`category.${food.category}`)}</Badge>
                  <Badge tone={food.source === 'estimate' ? 'warning' : 'primary'}>{t(`source.${food.source}`)}</Badge>
                  <Badge>{food.isCustom ? t('food.custom') : food.modified ? t('food.modified') : t('food.builtin')}</Badge>
                </div>
              </div>
              <button
                type="button"
                onClick={() => run(() => store.toggleFavorite(food.id))}
                aria-pressed={fav}
                aria-label={fav ? t('food.unfavorite') : t('food.favorite')}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border hover:bg-muted"
              >
                <Star className={cn('size-5', fav && 'fill-carbs text-carbs')} aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t('add.per100')}</span>
              <NutrientGrid n={food.per100g} />
            </div>

            {food.servings.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{t('food.servings')}</span>
                <ul className="flex flex-col divide-y rounded-xl border">
                  {food.servings.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span>
                        {servingLabel(s, locale)} <span className="text-muted-foreground tabular-nums">({fmtNum(s.grams, 1)} {t('unit.g')})</span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {f.kcal(scaleNutrients(food.per100g, s.grams).kcal)} {t('unit.kcal')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Notice icon={<Info />}>
              {t(`source.${food.source}.hint`)}
              {food.notes && <> {food.notes}</>}
            </Notice>

            <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t bg-popover px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button variant="destructive" size="lg" onClick={() => setConfirm(true)} aria-label={t('common.delete')}>
                <Trash2 aria-hidden />
              </Button>
              <Button variant="outline" size="lg" onClick={() => onEdit(food)}>
                <Pencil aria-hidden />
                {t('common.edit')}
              </Button>
              <Button size="lg" className="flex-1" onClick={() => onLog(food)}>
                <Plus aria-hidden />
                {t('food.logThis')}
              </Button>
            </div>
          </div>
        )}
      </AppSheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t('food.deleteConfirm')}
        description={t('food.deleteBody')}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (!food) return
          const removed = food
          onOpenChange(false)
          void run(() => store.deleteFood(removed.id), { success: t('food.deleted'), undo: () => store.saveFood({ ...removed, deleted: false }) })
        }}
      />
    </>
  )
}
