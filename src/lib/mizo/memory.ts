/**
 * Mizo memory: small, structured facts and preferences the person explicitly approved, kept on this
 * device per account (IndexedDB `mizano-mizo`, store `memories`). Shared by browser and server: no
 * secrets, no provider details. Nothing here ever saves on its own; every save follows a person's
 * explicit command or a tap on "Save".
 */
import {
  MIZO_MAX_MEMORY_CHARS,
  MIZO_MAX_REQUEST_MEMORIES,
  MIZO_MAX_REQUEST_MEMORY_CHARS,
  MIZO_MEMORY_CATEGORIES,
  type MizoMemoryCategory,
  type MizoWireMemory,
} from './protocol'

export { MIZO_MEMORY_CATEGORIES, type MizoMemoryCategory }

/** Hard cap per account so memory can never grow without bound. */
export const MIZO_MAX_MEMORIES = 30
const MAX_TAGS = 6

export interface MizoMemory {
  id: string
  /** The Supabase account id; every read and write is checked against it. */
  userId: string
  category: MizoMemoryCategory
  /** The approved wording, at most `MIZO_MAX_MEMORY_CHARS` characters. */
  content: string
  /** Lower-case keywords used for conservative relevance matching. */
  tags: string[]
  createdAt: string
  updatedAt: string
  provenance: {
    /** `user_command` = the person typed "Remember that…"; `mizo_suggestion` = Mizo proposed it and the person tapped Save. */
    source: 'user_command' | 'mizo_suggestion'
    confirmedAt: string
    conversationId?: string
  }
}

export class MemoryFullError extends Error {
  constructor() {
    super('Mizo memory is full')
    this.name = 'MemoryFullError'
  }
}

/** One line, spaces collapsed, no proposal markers, capped. */
export function normalizeMemoryContent(text: string): string {
  const clean = text.replace(/\[\[|\]\]/g, ' ').replace(/\s+/g, ' ').trim()
  return Array.from(clean).slice(0, MIZO_MAX_MEMORY_CHARS).join('').trim()
}

/**
 * Things that must never become a memory, whether typed or suggested: health/medical details,
 * body measurements, credentials and contact or payment details. Conservative on purpose.
 */
const SENSITIVE_EN: RegExp[] = [
  /\b(diagnos\w*|disease|disorder|diabet\w*|insulin|allerg\w*|intoleran\w*|celiac|coeliac|medication|medicine|pills?|prescri\w*|dose|dosage|pregnan\w*|period|menstrua\w*|anorexi\w*|bulimi\w*|binge|purg\w*|depress\w*|anxiety|adhd|autis\w*|cancer|surgery|blood pressure|cholesterol|thyroid|pcos|ibs|asthma|epilep\w*|therap\w*|self[- ]?harm|suicid\w*)\b/i,
  /\b(weigh|weighs|weight|weighing|bmi|body fat|waist|height)\b/i,
  /\d+(\.\d+)?\s?(kg|kgs|kilos?|kilograms?|lbs?|pounds?|cm|centimet\w*|feet|ft|inch\w*|كيلو|كجم|سم)(?![\p{L}])/iu,
  /\b(password|passcode|pin|otp|verification code|api key|token|secret|credit card|card number|cvv|iban|national id|passport)\b/i,
  /[^\s@]+@[^\s@]+\.[^\s@]+/,
  /\+?\d[\d\s-]{7,}\d/,
]

/** Arabic is matched word by word (JavaScript `\b` doesn't work for Arabic), after `و`/`ب`/`ل`/`ال` prefixes. */
const SENSITIVE_AR_WORDS = new Set([
  'تشخيص', 'مرض', 'مريض', 'مريضه', 'امراض', 'سكري', 'انسولين', 'حساسيه', 'دوا', 'دواء', 'ادويه', 'علاج', 'روشته', 'جرعه', 'حامل', 'اكتئاب',
  'اضطراب', 'ضغطي', 'كوليسترول', 'غده', 'ربو', 'صرع', 'سرطان', 'جراحه', 'انتحار', 'اذيه', 'وزني', 'وزن', 'طولي', 'كيلو', 'كيلوجرام', 'كجم', 'سم',
  'سنتي', 'سنتيمتر', 'باسورد',
])
const SENSITIVE_AR_PHRASES = ['كلمه السر', 'كلمه المرور', 'رمز التحقق', 'كود التحقق', 'رقم الكارت', 'رقم البطاقه', 'الرقم القومي', 'جواز السفر', 'رقم تليفوني', 'رقم موبايلي', 'فقدان الشهيه', 'ضغط الدم']

function arabicWords(text: string): string[] {
  return normalizeForMatch(text)
    .split(' ')
    .map((w) => w.replace(/^(?:وال|بال|لل|ال|و|ب)(?=[\u0600-\u06FF]{3,})/, ''))
}

export function isSensitiveMemory(text: string): boolean {
  if (SENSITIVE_EN.some((re) => re.test(text))) return true
  const norm = normalizeForMatch(text)
  if (SENSITIVE_AR_PHRASES.some((p) => norm.includes(p))) return true
  const words = normalizeForMatch(text).split(' ')
  return words.some((w) => SENSITIVE_AR_WORDS.has(w)) || arabicWords(text).some((w) => SENSITIVE_AR_WORDS.has(w))
}

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g

/** Lower-case, Arabic letters unified, punctuation removed. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP = new Set([
  'the', 'and', 'that', 'this', 'with', 'for', 'you', 'your', 'are', 'was', 'have', 'has', 'not', 'but', 'what', 'when', 'how', 'can', 'should',
  'would', 'could', 'about', 'from', 'like', 'just', 'really', 'very', 'want', 'need', 'give', 'some', 'any', 'me', 'my', 'mine', 'i', 'im', 'its',
  'please', 'remember', 'forget', 'mizo', 'today', 'tell', 'make', 'more', 'less', 'also', 'them', 'they', 'him', 'her', 'our', 'will', 'into',
  'انا', 'اني', 'انت', 'انتي', 'هو', 'هي', 'في', 'من', 'علي', 'الي', 'عن', 'مع', 'ده', 'دي', 'دا', 'اللي', 'التي', 'الذي', 'ان', 'او', 'لو',
  'ايه', 'اية', 'ازاي', 'امتي', 'كده', 'كدا', 'بس', 'جدا', 'اوي', 'عايز', 'عاوز', 'عايزه', 'محتاج', 'ممكن', 'لازم', 'يعني', 'ميزو', 'افتكر',
  'انسي', 'تذكر', 'احفظ', 'النهارده', 'انهارده', 'كل', 'حاجه', 'شويه', 'برضه', 'كمان', 'لما', 'قبل', 'بعد', 'عشان', 'علشان', 'هل', 'ما', 'لا',
])

/** Tokens for matching: Arabic `ال`/`و`/`ب` prefixes dropped, short and common words ignored. */
export function tokenize(text: string): string[] {
  const out = new Set<string>()
  for (let w of normalizeForMatch(text).split(' ')) {
    if (/^[\u0600-\u06FF]/.test(w)) {
      if (w.startsWith('وال')) w = w.slice(3)
      else if (w.startsWith('بال')) w = w.slice(3)
      else if (w.startsWith('ال')) w = w.slice(2)
    } else if (w.length > 4 && w.endsWith('s')) {
      w = w.slice(0, -1)
    }
    if (w.length < 3 || STOP.has(w)) continue
    out.add(w)
  }
  return [...out]
}

/** Topic words: a message about any of these makes that category's memories relevant. */
const TOPICS: Record<Exclude<MizoMemoryCategory, 'preference' | 'other'>, string[]> = {
  food: [
    'eat', 'eating', 'food', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'recipe', 'cook', 'dish', 'drink', 'protein', 'carb', 'fat', 'fruit',
    'vegetable', 'vegetarian', 'vegan', 'meat', 'chicken', 'fish', 'dessert', 'sweet', 'calorie', 'macro',
    'اكل', 'باكل', 'وجبه', 'وجبات', 'فطار', 'فطور', 'غدا', 'غداء', 'عشا', 'عشاء', 'سناك', 'طبخ', 'اطبخ', 'وصفه', 'اكله', 'مشروب', 'بروتين', 'كارب',
    'فاكهه', 'خضار', 'نباتي', 'لحمه', 'لحوم', 'فراخ', 'سمك', 'حلو', 'حلويات', 'سعرات', 'ماكروز',
  ],
  goal: ['goal', 'target', 'muscle', 'gain', 'bulk', 'energy', 'healthy', 'habit', 'consistency', 'progress', 'هدف', 'اهداف', 'عضل', 'عضلات', 'طاقه', 'صحي', 'عاده', 'التزام', 'تقدم'],
  routine: [
    'gym', 'workout', 'train', 'training', 'exercise', 'sport', 'run', 'morning', 'night', 'evening', 'schedule', 'sleep', 'school', 'work', 'study',
    'جيم', 'تمرين', 'تمارين', 'رياضه', 'جري', 'صبح', 'الصبح', 'بليل', 'ليل', 'مسا', 'جدول', 'نوم', 'مدرسه', 'شغل', 'مذاكره', 'روتين',
  ],
}
const TOPIC_TOKENS = Object.fromEntries(Object.entries(TOPICS).map(([k, words]) => [k, new Set(words.flatMap(tokenize))])) as Record<keyof typeof TOPICS, Set<string>>

const PREFERENCE_HINTS = /\b(reply|replies|answer|answers|respond|short|brief|detailed|long|emoji|language|english|arabic|call me|tone|formal|casual|joke|humou?r)\b|(رد|ردود|ردك|اختصار|مختصر|باختصار|تفاصيل|بالتفصيل|ايموجي|إيموجي|لغه|لغة|انجليزي|إنجليزي|عربي|ناديني|قولي|نكت|هزار|رسمي)/i

/** A best-effort category for a memory; the person sees it before saving. */
export function inferCategory(content: string): MizoMemoryCategory {
  if (PREFERENCE_HINTS.test(content)) return 'preference'
  const tokens = tokenize(content)
  for (const cat of ['food', 'routine', 'goal'] as const) if (tokens.some((t) => TOPIC_TOKENS[cat].has(t))) return cat
  return 'other'
}

export function deriveTags(content: string): string[] {
  return tokenize(content).slice(0, MAX_TAGS)
}

const PREFIXES = {
  save: [
    /^(?:please\s+|hey mizo,?\s+|mizo,?\s+)?(?:remember|don'?t forget|do not forget|keep in mind|note|save)\s+(?:that\s+|this:?\s+)?(.+)$/is,
    /^(?:ميزو\s*[،,]?\s*)?(?:من فضلك\s+|لو سمحت\s+)?(?:افتكر|إفتكر|اتذكر|إتذكر|تذكر|تذكّر|احفظ|إحفظ|خلي في بالك|خليك فاكر|متنساش|ما تنساش)\s+(?:إن|ان|أن|انّ|إنّ)?\s*(.+)$/s,
  ],
  forget: [
    /^(?:please\s+|mizo,?\s+)?forget\s+(?:that\s+|about\s+)?(.+)$/is,
    /^(?:ميزو\s*[،,]?\s*)?(?:من فضلك\s+|لو سمحت\s+)?(?:انسى|إنسى|انسي|إنسي|امسح من ذاكرتك|احذف من ذاكرتك)\s+(?:إن|ان|أن)?\s*(.+)$/s,
  ],
}

export type MemoryCommand = { kind: 'save'; content: string } | { kind: 'forget'; query: string }

/** Only an explicit "Remember that…" / "افتكر إن…" or "Forget…" / "انسى…" at the start of a message counts. */
export function parseMemoryCommand(text: string): MemoryCommand | null {
  const t = text.trim()
  for (const re of PREFIXES.save) {
    const m = re.exec(t)
    if (m?.[1]?.trim()) return { kind: 'save', content: normalizeMemoryContent(m[1]) }
  }
  for (const re of PREFIXES.forget) {
    const m = re.exec(t)
    if (m?.[1]?.trim()) return { kind: 'forget', query: m[1].trim() }
  }
  return null
}

/** Saved memories that share words with the query, best first. Used for "Forget…". */
export function matchMemories(memories: MizoMemory[], query: string): MizoMemory[] {
  const q = new Set(tokenize(query))
  if (q.size === 0) return []
  return memories
    .map((m) => ({ m, score: [...new Set([...tokenize(m.content), ...m.tags])].filter((t) => q.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.m.updatedAt.localeCompare(a.m.updatedAt))
    .map((x) => x.m)
}

export const sameMemory = (a: string, b: string) => normalizeForMatch(a) === normalizeForMatch(b)

/**
 * Conservative, bounded retrieval for one question:
 * - `preference` memories (how to reply) are always relevant, newest first, at most 2;
 * - other memories only when they share a keyword with the recent question(s), or the question is
 *   about their topic (food, goal, routine);
 * - at most `max` memories and `maxChars` characters in total. Never the whole store.
 */
export function selectRelevantMemories(
  memories: MizoMemory[],
  query: string,
  { max = MIZO_MAX_REQUEST_MEMORIES, maxChars = MIZO_MAX_REQUEST_MEMORY_CHARS } = {},
): MizoWireMemory[] {
  const q = new Set(tokenize(query))
  const topics = new Set((Object.keys(TOPIC_TOKENS) as Array<keyof typeof TOPIC_TOKENS>).filter((cat) => [...q].some((t) => TOPIC_TOKENS[cat].has(t))))
  const recent = [...memories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const prefs = recent.filter((m) => m.category === 'preference').slice(0, 2)
  const scored = recent
    .filter((m) => m.category !== 'preference')
    .map((m) => {
      const words = new Set([...tokenize(m.content), ...m.tags])
      const overlap = [...words].filter((t) => q.has(t)).length
      const topic = m.category !== 'other' && topics.has(m.category) ? 1 : 0
      return { m, score: overlap * 2 + topic }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.m)
  const out: MizoWireMemory[] = []
  let chars = 0
  for (const m of [...prefs, ...scored]) {
    if (out.length >= max) break
    const content = normalizeMemoryContent(m.content)
    if (!content || isSensitiveMemory(content) || chars + content.length > maxChars) continue
    chars += content.length
    out.push({ category: m.category, content })
  }
  return out
}

/** Mizo may end a reply with `[[remember: …]]` to suggest a memory. The app, not Mizo, saves it. */
const PROPOSAL = /\[\[\s*(?:remember|memory|تذكر|افتكر)\s*[:：]\s*([^\]]{1,400})\]\]/i

/** The reply without any suggestion marker, plus the suggestion if it is safe to offer. */
export function extractMemoryProposal(reply: string): { text: string; proposal: { content: string; category: MizoMemoryCategory } | null } {
  const m = PROPOSAL.exec(reply)
  const text = visibleReplyText(reply)
  if (!m) return { text, proposal: null }
  const content = normalizeMemoryContent(m[1])
  if (!content || isSensitiveMemory(content)) return { text, proposal: null }
  return { text, proposal: { content, category: inferCategory(content) } }
}

/** Hides complete markers and a marker still arriving at the end of a streaming reply. */
export function visibleReplyText(text: string): string {
  return text
    .replace(/\[\[[^\]]*\]\]/g, '')
    .replace(/\[\[[^\]]*$/, '')
    .replace(/\[$/, '')
    .replace(/[ \t]+\n/g, '\n')
    .trimEnd()
}

export { MIZO_MEMORY_CATEGORIES as MEMORY_CATEGORIES }
