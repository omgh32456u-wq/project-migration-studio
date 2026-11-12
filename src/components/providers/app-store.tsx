
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { mergeData } from '@/lib/backup'
import { createId, defaultSettings, normalizeSettings, PREFS_STORAGE_KEY } from '@/lib/defaults'
import { groupLogsByDate, nutritionDayKey } from '@/lib/nutrition-day'
import { REMINDERS_STORAGE_KEY } from '@/lib/reminders'
import { buildSeedFoods, SEED_VERSION } from '@/lib/foods-seed'
import { createTranslator, type Translator } from '@/lib/i18n'
import { openDatabase, type Database } from '@/lib/storage/db'
import { createSerialUpdater } from '@/lib/storage/serial'
import type { AppData, Food, LoggedItem, LogEntry, MealSlot, Recipe, SavedMeal, Settings, WeightEntry } from '@/lib/types'

/**
 * - blocked: waiting for another tab to release an older database connection.
 * - stale: this tab's connection was closed for another tab's upgrade; writes are no longer possible.
 */
type Status = 'loading' | 'ready' | 'error' | 'blocked' | 'stale'

interface StoreState extends AppData {
  status: Status
  persistent: boolean
}

export interface AppStore extends StoreState {
  i18n: Translator
  foodsById: Map<string, Food>
  logsByDate: Map<string, LogEntry[]>
  selectedDate: string
  setSelectedDate: (d: string) => void
  today: string
  mealName: (slot: MealSlot) => string
  updateSettings: (fn: (s: Settings) => Settings) => Promise<void>
  addLogItems: (items: LoggedItem[], date: string, meal: MealSlot) => Promise<LogEntry[]>
  updateLog: (entry: LogEntry) => Promise<void>
  deleteLog: (id: string) => Promise<LogEntry | undefined>
  restoreLog: (entry: LogEntry) => Promise<void>
  saveFood: (food: Food) => Promise<void>
  deleteFood: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  saveRecipe: (recipe: Recipe) => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  saveSavedMeal: (meal: SavedMeal) => Promise<void>
  deleteSavedMeal: (id: string) => Promise<void>
  addWeight: (date: string, kg: number) => Promise<void>
  deleteWeight: (id: string) => Promise<void>
  importData: (data: AppData, mode: 'merge' | 'replace') => Promise<void>
  resetAll: () => Promise<void>
  snapshot: () => AppData
}

const StoreContext = createContext<AppStore | null>(null)

export function useStore(): AppStore {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider')
  return ctx
}

export function useT() {
  return useStore().i18n
}

const EMPTY: StoreState = {
  status: 'loading',
  persistent: true,
  foods: [],
  logs: [],
  recipes: [],
  savedMeals: [],
  weights: [],
  settings: defaultSettings(),
}

function readBootPrefs(): Pick<Settings, 'locale' | 'theme'> {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Settings>
      return { locale: p.locale === 'ar' ? 'ar' : 'en', theme: p.theme === 'dark' || p.theme === 'light' ? p.theme : 'system' }
    }
  } catch {
    /* localStorage can be unavailable; fall back to defaults */
  }
  return { locale: 'en', theme: 'system' }
}

function applyDocumentPrefs(locale: Settings['locale'], theme: Settings['theme']) {
  const root = document.documentElement
  root.lang = locale
  root.dir = locale === 'ar' ? 'rtl' : 'ltr'
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ locale, theme }))
  } catch {
    /* ignore */
  }
}

async function loadAll(db: Database): Promise<AppData> {
  const seedVersion = await db.getMeta<number>('seedVersion')
  if (!seedVersion || seedVersion < SEED_VERSION) {
    const existing = new Set((await db.getAll('foods')).map((f) => f.id))
    await db.putMany('foods', buildSeedFoods().filter((f) => !existing.has(f.id)))
    await db.setMeta('seedVersion', SEED_VERSION)
  }
  const [foods, logs, recipes, savedMeals, weights, rawSettings] = await Promise.all([
    db.getAll('foods'),
    db.getAll('logs'),
    db.getAll('recipes'),
    db.getAll('savedMeals'),
    db.getAll('weights'),
    db.getMeta<Partial<Settings>>('settings'),
  ])
  const settings = rawSettings ? normalizeSettings(rawSettings) : { ...defaultSettings(), ...readBootPrefs() }
  return { foods, logs, recipes, savedMeals, weights, settings }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(EMPTY)
  const dbRef = useRef<Database | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  // "today" is the current nutrition day: the calendar day shifted by the user's day-start time.
  const dayStartMinutes = state.settings.dayStartMinutes
  const [today, setToday] = useState(() => nutritionDayKey(new Date(), defaultSettings().dayStartMinutes))
  const [selectedDate, setSelectedDate] = useState(today)
  const stateRef = useRef(state)
  stateRef.current = state
  const staleRef = useRef(false)
  const settingsUpdaterRef = useRef<ReturnType<typeof createSerialUpdater<Settings>> | null>(null)
  if (!settingsUpdaterRef.current) {
    settingsUpdaterRef.current = createSerialUpdater<Settings>(EMPTY.settings, async (next) => {
      if (!dbRef.current) throw new Error('Database not ready')
      await dbRef.current.setMeta('settings', next)
    })
  }

  const reload = useCallback(async () => {
    const db = dbRef.current
    if (!db || staleRef.current) return
    const data = await loadAll(db)
    if (staleRef.current) return
    settingsUpdaterRef.current?.reset(data.settings)
    setState({ ...data, status: 'ready', persistent: db.persistent })
  }, [])

  useEffect(() => {
    let cancelled = false
    const boot = readBootPrefs()
    setState((s) => ({ ...s, settings: { ...s.settings, ...boot } }))
    ;(async () => {
      try {
        const db = await openDatabase({
          onBlocked: () => {
            if (!cancelled) setState((s) => ({ ...s, status: 'blocked' }))
          },
          onVersionChange: () => {
            staleRef.current = true
            if (!cancelled) setState((s) => ({ ...s, status: 'stale' }))
          },
        })
        if (cancelled) return
        dbRef.current = db
        await reload()
        if (db.persistent && navigator.storage?.persist) navigator.storage.persist().catch(() => undefined)
      } catch {
        if (!cancelled) setState((s) => ({ ...s, status: 'error' }))
      }
    })()
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('tmm-sync')
      ch.onmessage = () => void reload().catch(() => undefined)
      channelRef.current = ch
    }
    return () => {
      cancelled = true
      channelRef.current?.close()
    }
  }, [reload])

  // Keep "today" correct across the day boundary, when the app returns from background, and when the
  // day-start setting loads or changes. Only navigation state moves; no stored entry is touched.
  useEffect(() => {
    const check = () => {
      const now = nutritionDayKey(new Date(), dayStartMinutes)
      setToday((prev) => {
        if (prev !== now) setSelectedDate((sel) => (sel === prev ? now : sel))
        return now
      })
    }
    check()
    const id = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [dayStartMinutes])

  const { locale, theme } = state.settings
  useEffect(() => {
    applyDocumentPrefs(locale, theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyDocumentPrefs(locale, theme)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [locale, theme])

  const db = () => {
    if (!dbRef.current) throw new Error('Database not ready')
    return dbRef.current
  }
  const notify = () => channelRef.current?.postMessage('changed')

  // Queued so each update builds on the previous saved result, not on the last rendered state.
  const updateSettings = useCallback(async (fn: (s: Settings) => Settings) => {
    const next = await settingsUpdaterRef.current!.update(fn)
    setState((s) => ({ ...s, settings: next }))
    notify()
  }, [])

  const addLogItems = useCallback(async (items: LoggedItem[], date: string, meal: MealSlot) => {
    const now = Date.now()
    const entries: LogEntry[] = items.map((item, i) => ({ ...item, id: createId('log'), date, meal, createdAt: now + i, updatedAt: now + i }))
    await db().putMany('logs', entries)
    setState((s) => ({ ...s, logs: [...s.logs, ...entries] }))
    notify()
    return entries
  }, [])

  const updateLog = useCallback(async (entry: LogEntry) => {
    const next = { ...entry, updatedAt: Date.now() }
    await db().put('logs', next)
    setState((s) => ({ ...s, logs: s.logs.map((l) => (l.id === next.id ? next : l)) }))
    notify()
  }, [])

  const deleteLog = useCallback(async (id: string) => {
    const found = stateRef.current.logs.find((l) => l.id === id)
    await db().remove('logs', id)
    setState((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) }))
    notify()
    return found
  }, [])

  const restoreLog = useCallback(async (entry: LogEntry) => {
    await db().put('logs', entry)
    setState((s) => ({ ...s, logs: [...s.logs.filter((l) => l.id !== entry.id), entry] }))
    notify()
  }, [])

  const saveFood = useCallback(async (food: Food) => {
    const next = { ...food, updatedAt: Date.now() }
    await db().put('foods', next)
    setState((s) => {
      const exists = s.foods.some((f) => f.id === next.id)
      return { ...s, foods: exists ? s.foods.map((f) => (f.id === next.id ? next : f)) : [...s.foods, next] }
    })
    notify()
  }, [])

  const deleteFood = useCallback(
    async (id: string) => {
      const food = stateRef.current.foods.find((f) => f.id === id)
      if (!food) return
      await saveFood({ ...food, deleted: true })
    },
    [saveFood],
  )

  const toggleFavorite = useCallback(
    (id: string) =>
      updateSettings((s) => ({
        ...s,
        favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
      })),
    [updateSettings],
  )

  const saveRecipe = useCallback(async (recipe: Recipe) => {
    const next = { ...recipe, updatedAt: Date.now() }
    await db().put('recipes', next)
    setState((s) => ({
      ...s,
      recipes: s.recipes.some((r) => r.id === next.id) ? s.recipes.map((r) => (r.id === next.id ? next : r)) : [...s.recipes, next],
    }))
    notify()
  }, [])

  const deleteRecipe = useCallback(async (id: string) => {
    await db().remove('recipes', id)
    setState((s) => ({ ...s, recipes: s.recipes.filter((r) => r.id !== id) }))
    notify()
  }, [])

  const saveSavedMeal = useCallback(async (meal: SavedMeal) => {
    const next = { ...meal, updatedAt: Date.now() }
    await db().put('savedMeals', next)
    setState((s) => ({
      ...s,
      savedMeals: s.savedMeals.some((m) => m.id === next.id) ? s.savedMeals.map((m) => (m.id === next.id ? next : m)) : [...s.savedMeals, next],
    }))
    notify()
  }, [])

  const deleteSavedMeal = useCallback(async (id: string) => {
    await db().remove('savedMeals', id)
    setState((s) => ({ ...s, savedMeals: s.savedMeals.filter((m) => m.id !== id) }))
    notify()
  }, [])

  const addWeight = useCallback(async (date: string, kg: number) => {
    const existing = stateRef.current.weights.find((w) => w.date === date)
    const entry: WeightEntry = { id: existing?.id ?? createId('w'), date, kg: Math.round(kg * 100) / 100, createdAt: Date.now() }
    await db().put('weights', entry)
    setState((s) => ({ ...s, weights: [...s.weights.filter((w) => w.id !== entry.id), entry] }))
    notify()
  }, [])

  const deleteWeight = useCallback(async (id: string) => {
    await db().remove('weights', id)
    setState((s) => ({ ...s, weights: s.weights.filter((w) => w.id !== id) }))
    notify()
  }, [])

  const snapshot = useCallback((): AppData => {
    const { foods, logs, recipes, savedMeals, weights, settings } = stateRef.current
    return { foods, logs, recipes, savedMeals, weights, settings }
  }, [])

  const importData = useCallback(
    async (incoming: AppData, mode: 'merge' | 'replace') => {
      const data = mode === 'merge' ? mergeData(snapshot(), incoming) : incoming
      await db().replaceAll(data)
      await reload()
      notify()
    },
    [reload, snapshot],
  )

  const resetAll = useCallback(async () => {
    await db().clearAll()
    try {
      localStorage.removeItem(PREFS_STORAGE_KEY)
      localStorage.removeItem(REMINDERS_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    await reload()
    notify()
  }, [reload])

  const i18n = useMemo(() => createTranslator(locale), [locale])
  const foodsById = useMemo(() => new Map(state.foods.map((f) => [f.id, f])), [state.foods])
  const logsByDate = useMemo(() => groupLogsByDate(state.logs), [state.logs])

  const mealNames = state.settings.mealNames
  const mealName = useCallback((slot: MealSlot) => mealNames[slot]?.trim() || i18n.t(`meal.${slot}`), [mealNames, i18n])

  const value: AppStore = {
    ...state,
    i18n,
    foodsById,
    logsByDate,
    selectedDate,
    setSelectedDate,
    today,
    mealName,
    updateSettings,
    addLogItems,
    updateLog,
    deleteLog,
    restoreLog,
    saveFood,
    deleteFood,
    toggleFavorite,
    saveRecipe,
    deleteRecipe,
    saveSavedMeal,
    deleteSavedMeal,
    addWeight,
    deleteWeight,
    importData,
    resetAll,
    snapshot,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
