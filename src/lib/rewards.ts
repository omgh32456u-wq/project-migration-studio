export const IDEA_KINDS = ['food', 'recipe', 'activity'] as const
export type IdeaKind = (typeof IDEA_KINDS)[number]

export interface Idea {
  id: string
  kind: IdeaKind
  en: string
  ar: string
}

/**
 * Neutral, just-for-fun suggestions. Deliberately no calorie/weight framing, no "earn/burn",
 * no good/bad food language, no paid spins and no caffeine or energy drinks.
 */
export const IDEAS: readonly Idea[] = [
  { id: 'f-fruit', kind: 'food', en: 'Try a seasonal fruit you haven’t had in a while', ar: 'جرّب فاكهة موسمية لم تأكلها منذ فترة' },
  { id: 'f-foul', kind: 'food', en: 'Foul with olive oil, cumin and a squeeze of lemon', ar: 'فول بزيت الزيتون والكمون وعصرة ليمون' },
  { id: 'f-yogurt', kind: 'food', en: 'Yogurt with honey and a handful of nuts', ar: 'زبادي بالعسل وحفنة من المكسرات' },
  { id: 'f-salad', kind: 'food', en: 'A colourful baladi salad with your main dish', ar: 'سلطة بلدي ملونة مع طبقك الرئيسي' },
  { id: 'f-dates', kind: 'food', en: 'A few dates with a glass of milk', ar: 'بضع تمرات مع كوب لبن' },
  { id: 'f-veg', kind: 'food', en: 'Add a vegetable you rarely cook to one meal', ar: 'أضف خضارًا نادرًا ما تطبخه إلى إحدى وجباتك' },
  { id: 'f-eggs', kind: 'food', en: 'Eggs with tomatoes and peppers for breakfast', ar: 'بيض بالطماطم والفلفل على الفطار' },
  { id: 'f-share', kind: 'food', en: 'Share a meal with family or a friend', ar: 'شارك وجبة مع العائلة أو صديق' },

  { id: 'r-lentil', kind: 'recipe', en: 'Lentil soup with lemon and toasted bread', ar: 'شوربة عدس بالليمون والعيش المحمص' },
  { id: 'r-koshari', kind: 'recipe', en: 'Home-made koshari with extra chickpeas', ar: 'كشري في البيت مع حمص زيادة' },
  { id: 'r-molokhia', kind: 'recipe', en: 'Molokhia with rice and grilled chicken', ar: 'ملوخية مع أرز وفراخ مشوية' },
  { id: 'r-shakshuka', kind: 'recipe', en: 'Shakshuka in one pan with fresh bread', ar: 'شكشوكة في طاسة واحدة مع عيش طازة' },
  { id: 'r-mahshi', kind: 'recipe', en: 'Stuffed peppers or zucchini (mahshi)', ar: 'محشي فلفل أو كوسة' },
  { id: 'r-fish', kind: 'recipe', en: 'Oven-baked fish with cumin and vegetables', ar: 'سمك في الفرن بالكمون والخضار' },
  { id: 'r-fatta', kind: 'recipe', en: 'Chickpea fatteh with yogurt and garlic', ar: 'فتة حمص بالزبادي والثوم' },
  { id: 'r-oats', kind: 'recipe', en: 'Overnight oats with banana and cinnamon', ar: 'شوفان منقوع بالموز والقرفة' },

  { id: 'a-walk', kind: 'activity', en: 'Take a relaxed 10-minute walk outside', ar: 'تمشَّ بهدوء ١٠ دقائق في الهواء الطلق' },
  { id: 'a-stretch', kind: 'activity', en: 'Stretch for five minutes', ar: 'تمدّد لمدة خمس دقائق' },
  { id: 'a-music', kind: 'activity', en: 'Put on a favourite song and dance', ar: 'شغّل أغنيتك المفضلة وارقص' },
  { id: 'a-call', kind: 'activity', en: 'Call or message someone you miss', ar: 'اتصل أو راسل شخصًا تفتقده' },
  { id: 'a-read', kind: 'activity', en: 'Read a few pages of a book', ar: 'اقرأ بضع صفحات من كتاب' },
  { id: 'a-breathe', kind: 'activity', en: 'Take five slow, deep breaths', ar: 'خذ خمسة أنفاس بطيئة وعميقة' },
  { id: 'a-tidy', kind: 'activity', en: 'Tidy one small corner of your space', ar: 'رتّب ركنًا صغيرًا من مكانك' },
  { id: 'a-draw', kind: 'activity', en: 'Doodle or write down one good thing from today', ar: 'ارسم شيئًا أو اكتب شيئًا جميلًا حدث اليوم' },
]

/** Wheel segments, clockwise from the top. Each kind appears equally often. */
export const WHEEL_SEGMENTS: readonly IdeaKind[] = ['food', 'recipe', 'activity', 'food', 'recipe', 'activity']
export const SEGMENT_DEG = 360 / WHEEL_SEGMENTS.length

type Random = () => number

const pickIndex = (length: number, random: Random) => Math.min(length - 1, Math.floor(random() * length))

/** Kind is chosen uniformly first so the mix stays balanced regardless of list sizes. */
export function pickIdea(random: Random = Math.random, previousId?: string): Idea {
  const kind = IDEA_KINDS[pickIndex(IDEA_KINDS.length, random)]
  const pool = IDEAS.filter((i) => i.kind === kind && i.id !== previousId)
  return pool[pickIndex(pool.length, random)]
}

export function segmentFor(kind: IdeaKind, random: Random = Math.random): number {
  const matches = WHEEL_SEGMENTS.flatMap((k, i) => (k === kind ? [i] : []))
  return matches[pickIndex(matches.length, random)]
}

/** Next absolute rotation that spins forward `turns` full turns and centres `segment` under the top pointer. */
export function nextRotation(current: number, segment: number, turns = 5): number {
  const target = (360 - (segment * SEGMENT_DEG + SEGMENT_DEG / 2)) % 360
  const delta = (((target - current) % 360) + 360) % 360
  return current + turns * 360 + delta
}
