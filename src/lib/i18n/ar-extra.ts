/** Arabic counterpart of en-extra.ts, merged by ./index.ts. */
export const arExtra = {
  'auth.signin.google': 'المتابعة بحساب Google',
  'auth.signin.email': 'المتابعة بالبريد الإلكتروني',
  'auth.explain':
    'تسجيل الدخول اختياري. يتيح لك تلقّي تحديثات المنتج واستخدام ميزات المزامنة المدعومة عند توفرها. يعمل ميزانو بشكل كامل دون حساب.',
  'auth.unavailable':
    'تسجيل الدخول عبر الإنترنت غير متاح في هذه النسخة بعد. يمكنك المتابعة دون حساب — تبقى بياناتك على هذا الجهاز.',
  'auth.guest': 'المتابعة بدون حساب',
  'onboarding.profile.hint2': 'أدر العجلات لتحديد بياناتك. يمكنك التخطي وتغييرها لاحقًا من الإعدادات.',
  'onboarding.age.under18': 'أقل من 18 — تبقى الأهداف الشخصية للطاقة معطّلة.',
  'intro.mute': 'كتم صوت البداية',
  'intro.unmute': 'تشغيل صوت البداية',
} as const

export type ArExtraKey = keyof typeof arExtra
