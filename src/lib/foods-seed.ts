import type { Food, FoodCategory } from './types'

/**
 * Starter foods. All values are APPROXIMATE typical values per 100 g compiled from
 * general food-composition knowledge. They are not taken from an official national
 * database or any product label, and real values vary with recipe, brand and preparation.
 * Each entry is therefore marked `source: 'estimate'`.
 */
export const SEED_VERSION = 1

type S = [labelEn: string, labelAr: string, grams: number]
type Row = [
  slug: string,
  nameEn: string,
  nameAr: string,
  category: FoodCategory,
  values: [kcal: number, protein: number, carbs: number, fat: number],
  servings: S[],
  note?: string,
]

const NOTE_VARIES = 'Home recipes vary widely; adjust if you know your recipe.'

const ROWS: Row[] = [
  // Bread & grains
  ['baladi-bread', 'Baladi bread', 'عيش بلدي', 'bread_grains', [260, 9, 52, 1.6], [['1 loaf', 'رغيف', 90], ['½ loaf', 'نصف رغيف', 45]], 'Loaf size varies between bakeries.'],
  ['shami-bread', 'Shami bread (white pita)', 'عيش شامي', 'bread_grains', [275, 9.1, 55.7, 1.2], [['1 loaf', 'رغيف', 60]]],
  ['fino-bread', 'Fino bread', 'عيش فينو', 'bread_grains', [280, 9, 53, 3], [['1 roll', 'رغيف فينو', 50]]],
  ['toast-white', 'White toast bread', 'خبز توست أبيض', 'bread_grains', [265, 9, 49, 3.2], [['1 slice', 'شريحة', 28]]],
  ['toast-brown', 'Whole-wheat toast bread', 'خبز توست بني', 'bread_grains', [250, 12, 43, 3.5], [['1 slice', 'شريحة', 28]]],
  ['rice-white', 'White rice, cooked', 'أرز أبيض مطبوخ', 'bread_grains', [130, 2.7, 28, 0.3], [['1 cup', 'كوب', 160], ['1 serving spoon', 'مغرفة', 60]]],
  ['rice-vermicelli', 'Egyptian rice with vermicelli', 'أرز بالشعرية', 'bread_grains', [170, 3, 30, 4], [['1 cup', 'كوب', 170]], NOTE_VARIES],
  ['pasta-cooked', 'Pasta, cooked', 'مكرونة مسلوقة', 'bread_grains', [158, 5.8, 31, 0.9], [['1 cup', 'كوب', 140]]],
  ['oats', 'Oats, dry', 'شوفان', 'bread_grains', [389, 16.9, 66, 6.9], [['½ cup', 'نصف كوب', 40]]],
  ['bulgur-cooked', 'Bulgur, cooked', 'برغل مطبوخ', 'bread_grains', [83, 3.1, 18.6, 0.2], [['1 cup', 'كوب', 180]]],
  ['feteer', 'Feteer meshaltet', 'فطير مشلتت', 'bread_grains', [370, 7, 42, 19], [['1 piece', 'قطعة', 100]], NOTE_VARIES],
  ['cornflakes', 'Corn flakes', 'كورن فليكس', 'bread_grains', [357, 7.5, 84, 0.4], [['1 bowl', 'طبق', 30]], 'Check your package label for exact values.'],

  // Legumes
  ['foul-plain', 'Foul medames, plain', 'فول مدمس سادة', 'legumes', [110, 7.6, 19.6, 0.4], [['1 plate', 'طبق', 150], ['1 tbsp', 'ملعقة كبيرة', 15]]],
  ['foul-oil', 'Foul medames with oil', 'فول مدمس بالزيت', 'legumes', [150, 7, 18, 5.5], [['1 plate', 'طبق', 150]], 'Assumes about 1 tbsp oil per plate; adjust as needed.'],
  ['taameya', 'Taameya (Egyptian falafel)', 'طعمية', 'legumes', [333, 13.3, 31.8, 17.8], [['1 piece', 'قرص', 20]], 'Fried; oil absorption varies.'],
  ['lentil-soup', 'Lentil soup', 'شوربة عدس', 'legumes', [80, 4.5, 12, 1.5], [['1 bowl', 'سلطانية', 250]], NOTE_VARIES],
  ['koshari', 'Koshari', 'كشري', 'dishes', [160, 5.5, 28, 3.5], [['Small plate', 'طبق صغير', 300], ['Large plate', 'طبق كبير', 500]], NOTE_VARIES],
  ['chickpeas', 'Chickpeas, cooked', 'حمص مسلوق', 'legumes', [164, 8.9, 27.4, 2.6], [['1 cup', 'كوب', 160]]],
  ['lentils', 'Lentils, cooked', 'عدس مطبوخ', 'legumes', [116, 9, 20, 0.4], [['1 cup', 'كوب', 200]]],
  ['hummus', 'Hummus', 'حمص بالطحينة', 'legumes', [166, 7.9, 14.3, 9.6], [['1 tbsp', 'ملعقة كبيرة', 15]]],
  ['bessara', 'Bessara', 'بصارة', 'legumes', [120, 7, 16, 3.5], [['1 plate', 'طبق', 200]], NOTE_VARIES],

  // Dairy & eggs
  ['egg-boiled', 'Egg, boiled', 'بيض مسلوق', 'dairy_eggs', [155, 12.6, 1.1, 10.6], [['1 large egg', 'بيضة كبيرة', 50]]],
  ['egg-fried', 'Egg, fried', 'بيض مقلي', 'dairy_eggs', [196, 13.6, 0.8, 14.8], [['1 egg', 'بيضة', 46]]],
  ['egg-white', 'Egg white', 'بياض بيض', 'dairy_eggs', [52, 10.9, 0.7, 0.2], [['1 egg white', 'بياض بيضة', 33]]],
  ['milk-whole', 'Milk, full fat', 'لبن كامل الدسم', 'dairy_eggs', [61, 3.2, 4.8, 3.3], [['1 cup (240 ml)', 'كوب (240 مل)', 244]]],
  ['milk-lowfat', 'Milk, low fat', 'لبن قليل الدسم', 'dairy_eggs', [46, 3.4, 4.9, 1.5], [['1 cup (240 ml)', 'كوب (240 مل)', 244]]],
  ['yogurt-plain', 'Yogurt, plain', 'زبادي سادة', 'dairy_eggs', [61, 3.5, 4.7, 3.3], [['1 cup', 'علبة', 105]]],
  ['yogurt-greek', 'Greek yogurt, plain, low fat', 'زبادي يوناني قليل الدسم', 'dairy_eggs', [59, 10.3, 3.6, 0.4], [['1 cup', 'علبة', 170]]],
  ['cheese-white', 'White cheese (Domiati)', 'جبنة بيضاء (دمياطي)', 'dairy_eggs', [240, 16, 2.5, 19], [['1 slice', 'شريحة', 30]], 'Fat and salt vary a lot between brands.'],
  ['cheese-areesh', 'Areesh cheese', 'جبنة قريش', 'dairy_eggs', [95, 14, 3.5, 2.5], [['1 tbsp', 'ملعقة كبيرة', 20]]],
  ['cheese-roumi', 'Roumi cheese', 'جبنة رومي', 'dairy_eggs', [380, 26, 2, 30], [['1 slice', 'شريحة', 20]]],
  ['cheese-feta', 'Feta cheese', 'جبنة فيتا', 'dairy_eggs', [264, 14.2, 4.1, 21.3], [['1 slice', 'شريحة', 30]]],
  ['cheese-cheddar', 'Cheddar cheese', 'جبنة شيدر', 'dairy_eggs', [403, 24.9, 1.3, 33.1], [['1 slice', 'شريحة', 20]]],
  ['cheese-mozzarella', 'Mozzarella cheese', 'جبنة موتزاريلا', 'dairy_eggs', [300, 22, 2.2, 22], [['1 slice', 'شريحة', 25]]],
  ['cheese-triangle', 'Processed cheese triangle', 'جبنة مثلثات', 'dairy_eggs', [240, 10, 6, 20], [['1 triangle', 'مثلث', 17]], 'Check your package label for exact values.'],
  ['butter', 'Butter', 'زبدة', 'nuts_oils', [717, 0.9, 0.1, 81], [['1 tsp', 'ملعقة صغيرة', 5]]],
  ['ghee', 'Ghee (samna)', 'سمنة', 'nuts_oils', [876, 0.3, 0, 99.5], [['1 tbsp', 'ملعقة كبيرة', 13]]],

  // Meat & fish
  ['chicken-breast', 'Chicken breast, grilled, skinless', 'صدر فراخ مشوي بدون جلد', 'meat_fish', [165, 31, 0, 3.6], [['1 piece', 'قطعة', 120]]],
  ['chicken-thigh', 'Chicken thigh, roasted with skin', 'ورك فراخ مشوي بالجلد', 'meat_fish', [229, 23.3, 0, 14.7], [['1 piece', 'قطعة', 110]]],
  ['beef-cooked', 'Beef, cooked (medium fat)', 'لحم بقري مطبوخ', 'meat_fish', [250, 26, 0, 15], [['1 piece', 'قطعة', 90]]],
  ['kofta', 'Kofta, grilled', 'كفتة مشوية', 'meat_fish', [260, 18, 4, 19], [['1 skewer', 'صباع', 50]], NOTE_VARIES],
  ['liver-alex', 'Alexandrian liver', 'كبدة إسكندراني', 'meat_fish', [190, 25, 5, 8], [['1 sandwich filling', 'حشوة سندوتش', 80]], NOTE_VARIES],
  ['tilapia', 'Tilapia (bolti), baked', 'سمك بلطي مشوي', 'meat_fish', [128, 26.2, 0, 2.7], [['1 fillet', 'فيليه', 120]]],
  ['fish-fried', 'Fish, fried', 'سمك مقلي', 'meat_fish', [200, 22, 6, 10], [['1 piece', 'قطعة', 150]], 'Breading and oil absorption vary.'],
  ['tuna-water', 'Tuna, canned in water, drained', 'تونة معلبة بالماء', 'meat_fish', [116, 25.5, 0, 0.8], [['1 can (drained)', 'علبة (مصفاة)', 120]]],
  ['tuna-oil', 'Tuna, canned in oil, drained', 'تونة معلبة بالزيت', 'meat_fish', [198, 29, 0, 8], [['1 can (drained)', 'علبة (مصفاة)', 120]]],
  ['sardines', 'Sardines, canned in oil', 'سردين معلب بالزيت', 'meat_fish', [208, 24.6, 0, 11.5], [['1 can (drained)', 'علبة (مصفاة)', 90]]],
  ['shrimp', 'Shrimp, cooked', 'جمبري مطبوخ', 'meat_fish', [99, 24, 0.2, 0.3], [['1 serving', 'حصة', 100]]],
  ['hawawshi', 'Hawawshi', 'حواوشي', 'dishes', [280, 12, 25, 15], [['1 loaf', 'رغيف', 200]], NOTE_VARIES],
  ['shawarma-chicken', 'Chicken shawarma sandwich', 'سندوتش شاورما فراخ', 'dishes', [230, 13, 22, 10], [['1 sandwich', 'سندوتش', 200]], NOTE_VARIES],

  // Vegetables & dishes
  ['tomato', 'Tomato', 'طماطم', 'vegetables', [18, 0.9, 3.9, 0.2], [['1 medium', 'حبة متوسطة', 120]]],
  ['cucumber', 'Cucumber', 'خيار', 'vegetables', [15, 0.7, 3.6, 0.1], [['1 medium', 'حبة متوسطة', 100]]],
  ['lettuce', 'Lettuce', 'خس', 'vegetables', [15, 1.4, 2.9, 0.2], [['1 cup', 'كوب', 50]]],
  ['carrot', 'Carrot', 'جزر', 'vegetables', [41, 0.9, 9.6, 0.2], [['1 medium', 'حبة متوسطة', 60]]],
  ['onion', 'Onion', 'بصل', 'vegetables', [40, 1.1, 9.3, 0.1], [['1 medium', 'حبة متوسطة', 110]]],
  ['potato-boiled', 'Potato, boiled', 'بطاطس مسلوقة', 'vegetables', [87, 1.9, 20.1, 0.1], [['1 medium', 'حبة متوسطة', 150]]],
  ['fries', 'French fries', 'بطاطس محمرة', 'vegetables', [312, 3.4, 41, 15], [['1 portion', 'طبق', 120]]],
  ['spinach-cooked', 'Spinach, cooked', 'سبانخ مطبوخة', 'vegetables', [23, 3, 3.8, 0.3], [['1 cup', 'كوب', 180]]],
  ['eggplant-fried', 'Eggplant, fried', 'باذنجان مقلي', 'vegetables', [170, 1.5, 9, 14.5], [['1 slice', 'شريحة', 40]], 'Eggplant absorbs a lot of oil; values vary.'],
  ['egyptian-salad', 'Egyptian green salad (no dressing)', 'سلطة خضراء', 'vegetables', [20, 0.9, 4, 0.2], [['1 bowl', 'طبق', 150]]],
  ['pickles', 'Mixed pickles (torshi)', 'طرشي مشكل', 'vegetables', [15, 0.5, 2.5, 0.3], [['1 tbsp', 'ملعقة كبيرة', 20]], 'High in salt.'],
  ['molokhia', 'Molokhia', 'ملوخية', 'dishes', [45, 2.5, 4, 2], [['1 bowl', 'سلطانية', 250]], NOTE_VARIES],
  ['bamya', 'Okra stew (bamya)', 'بامية', 'dishes', [90, 4, 8, 5], [['1 bowl', 'سلطانية', 250]], NOTE_VARIES],
  ['mahshi', 'Mahshi (stuffed vegetables)', 'محشي', 'dishes', [140, 2.5, 20, 5.5], [['1 piece', 'قطعة', 60]], NOTE_VARIES],
  ['baba-ghanoug', 'Baba ghanoug', 'بابا غنوج', 'dishes', [130, 2.5, 8, 10], [['1 tbsp', 'ملعقة كبيرة', 15]], NOTE_VARIES],

  // Fruits
  ['banana', 'Banana', 'موز', 'fruits', [89, 1.1, 22.8, 0.3], [['1 medium', 'حبة متوسطة', 118]]],
  ['apple', 'Apple', 'تفاح', 'fruits', [52, 0.3, 13.8, 0.2], [['1 medium', 'حبة متوسطة', 180]]],
  ['orange', 'Orange', 'برتقال', 'fruits', [47, 0.9, 11.8, 0.1], [['1 medium', 'حبة متوسطة', 130]]],
  ['mango', 'Mango', 'مانجو', 'fruits', [60, 0.8, 15, 0.4], [['1 cup, sliced', 'كوب مقطع', 165]]],
  ['guava', 'Guava', 'جوافة', 'fruits', [68, 2.6, 14.3, 1], [['1 fruit', 'حبة', 100]]],
  ['watermelon', 'Watermelon', 'بطيخ', 'fruits', [30, 0.6, 7.6, 0.2], [['1 slice', 'شريحة', 280]]],
  ['grapes', 'Grapes', 'عنب', 'fruits', [69, 0.7, 18.1, 0.2], [['1 cup', 'كوب', 150]]],
  ['strawberries', 'Strawberries', 'فراولة', 'fruits', [32, 0.7, 7.7, 0.3], [['1 cup', 'كوب', 150]]],
  ['pomegranate', 'Pomegranate seeds', 'رمان', 'fruits', [83, 1.7, 18.7, 1.2], [['½ cup', 'نصف كوب', 87]]],
  ['figs', 'Figs, fresh', 'تين طازج', 'fruits', [74, 0.8, 19, 0.3], [['1 fig', 'حبة', 50]]],
  ['dates', 'Dates', 'بلح / تمر', 'fruits', [282, 2.5, 75, 0.4], [['1 date', 'تمرة', 10]], 'Fresh dates have less energy per gram than dried.'],

  // Sweets & spreads
  ['honey', 'Honey', 'عسل نحل', 'sweets_spreads', [304, 0.3, 82.4, 0], [['1 tbsp', 'ملعقة كبيرة', 21], ['1 tsp', 'ملعقة صغيرة', 7]]],
  ['molasses', 'Black molasses (asal eswed)', 'عسل أسود', 'sweets_spreads', [290, 0, 75, 0.1], [['1 tbsp', 'ملعقة كبيرة', 20]]],
  ['tahini', 'Tahini', 'طحينة', 'sweets_spreads', [595, 17, 21.2, 53.8], [['1 tbsp', 'ملعقة كبيرة', 15]]],
  ['halawa', 'Halawa (tahini halva)', 'حلاوة طحينية', 'sweets_spreads', [520, 12, 53, 30], [['1 tbsp', 'ملعقة كبيرة', 20]]],
  ['jam', 'Jam', 'مربى', 'sweets_spreads', [278, 0.4, 69, 0.1], [['1 tbsp', 'ملعقة كبيرة', 20]]],
  ['sugar', 'Sugar', 'سكر', 'sweets_spreads', [387, 0, 100, 0], [['1 tsp', 'ملعقة صغيرة', 4]]],
  ['basbousa', 'Basbousa', 'بسبوسة', 'sweets_spreads', [330, 4, 50, 13], [['1 piece', 'قطعة', 60]], NOTE_VARIES],
  ['konafa', 'Konafa', 'كنافة', 'sweets_spreads', [400, 6, 45, 22], [['1 piece', 'قطعة', 80]], NOTE_VARIES],
  ['om-ali', 'Om Ali', 'أم علي', 'sweets_spreads', [220, 5, 25, 11], [['1 bowl', 'طبق', 200]], NOTE_VARIES],
  ['rice-pudding', 'Rice pudding (roz bel laban)', 'أرز باللبن', 'sweets_spreads', [130, 3.5, 21, 3.5], [['1 cup', 'كوب', 150]], NOTE_VARIES],
  ['dark-chocolate', 'Dark chocolate (70%)', 'شوكولاتة داكنة 70%', 'sweets_spreads', [598, 7.8, 45.9, 42.6], [['1 square', 'مربع', 10]]],
  ['peanut-butter', 'Peanut butter', 'زبدة فول سوداني', 'sweets_spreads', [588, 25, 20, 50], [['1 tbsp', 'ملعقة كبيرة', 16]]],

  // Nuts & oils
  ['peanuts', 'Peanuts, roasted', 'فول سوداني محمص', 'nuts_oils', [585, 24, 21, 50], [['1 handful', 'حفنة', 30]]],
  ['almonds', 'Almonds', 'لوز', 'nuts_oils', [579, 21.2, 21.6, 49.9], [['1 handful', 'حفنة', 30]]],
  ['sunflower-seeds', 'Sunflower seeds (lib)', 'لب سوري', 'nuts_oils', [584, 20.8, 20, 51.5], [['1 handful (shelled)', 'حفنة (مقشر)', 30]]],
  ['olive-oil', 'Olive oil', 'زيت زيتون', 'nuts_oils', [884, 0, 0, 100], [['1 tbsp', 'ملعقة كبيرة', 13.5], ['1 tsp', 'ملعقة صغيرة', 4.5]]],
  ['sunflower-oil', 'Sunflower oil', 'زيت عباد الشمس', 'nuts_oils', [884, 0, 0, 100], [['1 tbsp', 'ملعقة كبيرة', 13.5]]],

  // Drinks
  ['tea-plain', 'Tea, unsweetened', 'شاي بدون سكر', 'drinks', [1, 0, 0.3, 0], [['1 cup (240 ml)', 'كوب (240 مل)', 240]], 'Log sugar separately if added.'],
  ['coffee-turkish', 'Turkish coffee, unsweetened', 'قهوة تركي سادة', 'drinks', [2, 0.1, 0.3, 0], [['1 cup (60 ml)', 'فنجان (60 مل)', 60]], 'Log sugar separately if added.'],
  ['sugarcane-juice', 'Sugarcane juice (asab)', 'عصير قصب', 'drinks', [75, 0.2, 18, 0.1], [['1 glass (250 ml)', 'كوب (250 مل)', 250]]],
  ['orange-juice', 'Orange juice', 'عصير برتقال', 'drinks', [45, 0.7, 10.4, 0.2], [['1 glass (250 ml)', 'كوب (250 مل)', 250]]],
  ['karkade', 'Hibiscus (karkade), sweetened', 'كركديه بالسكر', 'drinks', [40, 0, 10, 0], [['1 glass (250 ml)', 'كوب (250 مل)', 250]], NOTE_VARIES],
  ['sobia', 'Sobia', 'سوبيا', 'drinks', [100, 2, 18, 2], [['1 glass (250 ml)', 'كوب (250 مل)', 250]], NOTE_VARIES],
  ['cola', 'Cola, regular', 'مشروب كولا', 'drinks', [42, 0, 10.6, 0], [['1 can (330 ml)', 'علبة (330 مل)', 330]]],

  // Snacks
  ['potato-chips', 'Potato chips', 'شيبسي بطاطس', 'snacks_packaged', [536, 7, 53, 34.6], [['1 small bag', 'كيس صغير', 30]], 'Check your package label for exact values.'],
]

export function buildSeedFoods(now = Date.now()): Food[] {
  return ROWS.map(([slug, nameEn, nameAr, category, [kcal, protein, carbs, fat], servings, note]) => ({
    id: `seed:${slug}`,
    nameEn,
    nameAr,
    category,
    per100g: { kcal, protein, carbs, fat },
    servings: servings.map(([labelEn, labelAr, grams], i) => ({ id: `seed:${slug}:${i}`, labelEn, labelAr, grams })),
    source: 'estimate',
    notes: note ?? '',
    isCustom: false,
    modified: false,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  }))
}
