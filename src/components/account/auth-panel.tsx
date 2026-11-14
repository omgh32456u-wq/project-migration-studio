import { useEffect, useId, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Circle, CircleCheck, CircleX, Eye, EyeOff, Mail, MailCheck, Smartphone, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import {
  canSubmitSignUp,
  PASSWORD_RULES,
  passwordChecks,
  passwordStrength,
  validateEmailCredentials,
  type AuthErrorCode,
  type AuthMode,
  type PasswordStrength,
} from '@/lib/account'
import type { MessageKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useAccount } from './account-provider'
import { AppleMark, GoogleMark } from './provider-icons'

type View = 'options' | 'email' | 'confirm'

const PROVIDER_BTN =
  'relative h-11 w-full justify-center rounded-xl border px-11 text-sm font-medium shadow-none transition-[background-color,opacity] active:scale-[0.99]'

/** All four provider buttons share size, verb and the neutral provider surface. */
function ProviderButton({
  icon,
  label,
  onClick,
  disabled,
  tone = 'provider',
  aside,
}: {
  icon?: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  tone?: 'provider' | 'apple'
  aside?: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        PROVIDER_BTN,
        tone === 'apple'
          ? 'border-apple-foreground/80 bg-apple text-apple-foreground hover:bg-apple hover:text-apple-foreground dark:border-transparent dark:bg-apple dark:hover:bg-apple'
          : 'border-provider-border bg-provider text-provider-foreground hover:border-provider-border hover:bg-provider/90 hover:text-provider-foreground dark:border-provider-border dark:bg-provider dark:hover:bg-provider/90',
        'disabled:opacity-55',
      )}
    >
      {icon && <span className="absolute start-3.5 flex size-5 items-center justify-center">{icon}</span>}
      {aside ? (
        // Availability sits under the label so long labels never collide with it.
        <span className="flex min-w-0 flex-col items-center leading-tight">
          <span className="max-w-full truncate">{label}</span>
          <span className="text-[11px] font-normal opacity-80">{aside}</span>
        </span>
      ) : (
        <span className="truncate">{label}</span>
      )}
    </Button>
  )
}

/**
 * Sign up and sign in as two distinct interfaces (switched explicitly, never automatically).
 * Order: Google, Apple, Email, Phone, then the mode switch and "Continue as guest".
 * Apple and phone stay visibly disabled until a real, no-cost setup exists.
 */
export function AuthPanel({
  mode,
  onModeChange,
  onGuest,
  renderHeader,
  note,
  fill = false,
}: {
  mode: AuthMode
  onModeChange: (m: AuthMode) => void
  onGuest?: () => void
  renderHeader?: (title: string, hint: string) => ReactNode
  /** Small line shown under the guest action. */
  note?: ReactNode
  /** Pin the footer to the bottom of a fixed-height card (onboarding); two columns on short landscape screens. */
  fill?: boolean
}) {
  const store = useStore()
  const { t, dir } = store.i18n
  const account = useAccount()
  const [view, setView] = useState<View>('options')
  const [notice, setNotice] = useState<AuthErrorCode | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent'>('idle')
  const noticeId = useId()
  const { redirectNotice, clearRedirectNotice } = account

  // A returning Google redirect or email link that failed is explained here once.
  useEffect(() => {
    if (!redirectNotice) return
    setNotice(redirectNotice)
    clearRedirectNotice()
  }, [redirectNotice, clearRedirectNotice])

  const showConfirm = (email: string) => {
    setSentTo(email)
    setResend('idle')
    setView('confirm')
  }

  const resendEmail = async () => {
    setNotice(null)
    setResend('sending')
    const r = await account.resendConfirmation(sentTo)
    if (r.ok) setResend('sent')
    else {
      setResend('idle')
      setNotice(r.error)
    }
  }
  const signUp = mode === 'sign_up'
  const verb = signUp ? 'signup' : 'signin'
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft
  // The sign-up form is the tallest view. On short screens the header hint and privacy line step aside;
  // on the smallest and short-landscape screens the footer does too (it is one tap away via "Other options").
  const compactEmail = fill && view === 'email' && signUp

  const switchMode = (m: AuthMode) => {
    setNotice(null)
    setView((v) => (v === 'confirm' ? 'options' : v))
    onModeChange(m)
  }

  const google = async () => {
    setNotice(null)
    setBusy(true)
    const r = await account.signInWithGoogle(mode)
    setBusy(false)
    if (!r.ok) setNotice(r.error)
  }

  const title = view === 'confirm' ? t('auth.confirm.title') : t(signUp ? 'auth.signup.title' : 'auth.signin.title')
  const hint = view === 'confirm' ? t('auth.confirm.body', { email: sentTo }) : t(signUp ? 'auth.signup.hint' : 'auth.signin.hint')

  const footer = (
    <div
      className={cn(
        'flex shrink-0 flex-col gap-2',
        fill && 'mt-auto roomy:mt-2 landscape-short:col-start-1 landscape-short:row-start-2 landscape-short:self-end',
        compactEmail && 'tiny:hidden landscape-short:hidden',
      )}
    >
      <p className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">
        {t(signUp ? 'auth.haveAccount' : 'auth.newHere')}
        <button
          type="button"
          className="min-h-9 rounded-md px-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          onClick={() => switchMode(signUp ? 'sign_in' : 'sign_up')}
        >
          {t(signUp ? 'auth.toSignIn' : 'auth.toSignUp')}
        </button>
      </p>
      {onGuest && (
        <Button size="lg" onClick={onGuest}>
          <UserRound aria-hidden />
          {t('auth.guest')}
        </Button>
      )}
      {note && <div className={cn(compactEmail && 'short:hidden')}>{note}</div>}
    </div>
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        fill && 'min-h-0 flex-1 landscape-short:grid landscape-short:grid-cols-2 landscape-short:grid-rows-[auto_1fr] landscape-short:gap-x-6',
        compactEmail && 'landscape-short:flex',
      )}
      data-auth-mode={mode}
    >
      {renderHeader && (
        <div className={cn(fill && 'landscape-short:col-start-1 landscape-short:row-start-1', compactEmail && 'short:[&_header_p]:hidden')}>
          {renderHeader(title, hint)}
        </div>
      )}
      <div className={cn('flex flex-col gap-3', fill && 'landscape-short:col-start-2 landscape-short:row-span-2 landscape-short:row-start-1 landscape-short:justify-center')}>

      {view === 'options' && (
        <div className="flex shrink-0 flex-col gap-2" aria-describedby={notice ? noticeId : undefined}>
          <ProviderButton icon={<GoogleMark />} label={t(`auth.${verb}.google` as MessageKey)} onClick={() => void google()} disabled={busy} />
          <ProviderButton tone="apple" icon={<AppleMark className="-mt-0.5" />} label={t(`auth.${verb}.apple` as MessageKey)} disabled aside={t('auth.comingLater')} />
          <ProviderButton
            icon={<Mail className="size-[18px]" strokeWidth={2} aria-hidden />}
            label={t(`auth.${verb}.email` as MessageKey)}
            onClick={() => {
              setNotice(null)
              setView('email')
            }}
          />
          <ProviderButton
            icon={<Smartphone className="size-[18px]" strokeWidth={2} aria-hidden />}
            label={t(`auth.${verb}.phone` as MessageKey)}
            disabled
            aside={t('auth.comingLater')}
          />
        </div>
      )}

      {view === 'email' && (
        <EmailForm
          mode={mode}
          compact={fill}
          onBack={() => {
            setNotice(null)
            setView('options')
          }}
          backIcon={<Back aria-hidden />}
          onNeedsConfirmation={showConfirm}
        />
      )}

      {view === 'confirm' && (
        <div className="flex shrink-0 flex-col items-center gap-3 rounded-2xl bg-muted px-4 py-4 text-center">
          <MailCheck className="size-6 text-primary" aria-hidden />
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {resend === 'sent' ? t('auth.confirm.resent') : t('auth.confirm.spam')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" disabled={resend === 'sending'} onClick={() => void resendEmail()}>
              {resend === 'sending' ? t('auth.working') : t('auth.confirm.resend')}
            </Button>
            {signUp && (
              <Button variant="ghost" onClick={() => switchMode('sign_in')}>
                {t('auth.toSignIn')}
              </Button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <p id={noticeId} role="status" className="shrink-0 rounded-2xl bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {t(`auth.error.${notice}` as MessageKey)}
        </p>
      )}
      </div>

      {footer}
    </div>
  )
}

function EmailForm({
  mode,
  compact = false,
  onBack,
  backIcon,
  onNeedsConfirmation,
}: {
  mode: AuthMode
  /** Fixed-height onboarding card: sign-up uses two columns on short landscape screens. */
  compact?: boolean
  onBack: () => void
  backIcon: ReactNode
  onNeedsConfirmation: (email: string) => void
}) {
  const { t } = useStore().i18n
  const account = useAccount()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<AuthErrorCode | null>(null)
  const [busy, setBusy] = useState(false)
  const rulesId = useId()
  const matchId = useId()
  const signUp = mode === 'sign_up'
  const grid = compact && signUp
  const at = (cls: string) => (grid ? cls : undefined)
  // Sign-up stays disabled until every rule passes; sign-in only blocks while a request runs.
  const submitDisabled = signUp ? !canSubmitSignUp(email, password, confirm, busy) : busy

  const submit = async () => {
    const invalid = validateEmailCredentials(mode, email, password, signUp ? confirm : undefined)
    if (invalid) return setError(invalid)
    setError(null)
    setBusy(true)
    try {
      // Sign-up and sign-in are separate calls; a failed sign-in never falls back to creating an account.
      if (signUp) {
        const r = await account.signUpWithEmail(email.trim(), password)
        if (!r.ok) setError(r.error)
        else if (r.needsConfirmation) onNeedsConfirmation(email.trim())
      } else {
        const r = await account.signInWithEmail(email.trim(), password)
        // An unconfirmed account gets the "check your email" view with a resend button.
        if (!r.ok && r.error === 'email_not_confirmed') onNeedsConfirmation(email.trim())
        else if (!r.ok) setError(r.error)
      }
    } catch {
      setError('network')
    } finally {
      setBusy(false)
    }
  }

  const fieldError = (codes: AuthErrorCode[]) => (error && codes.includes(error) ? t(`auth.error.${error}` as MessageKey) : null)
  const formError =
    error && !['invalid_email', 'missing_password', 'weak_password', 'password_mismatch'].includes(error) ? t(`auth.error.${error}` as MessageKey) : null

  return (
    <form
      className={cn(
        'flex shrink-0 flex-col gap-3 short:gap-2',
        // Short landscape: fields | confirmation + actions | live requirements, so nothing scrolls.
        grid && 'landscape-short:grid landscape-short:grid-cols-3 landscape-short:grid-rows-[auto_auto] landscape-short:gap-x-4',
      )}
      noValidate
      aria-label={t(signUp ? 'auth.signup.email' : 'auth.signin.email')}
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Field label={t('auth.email')} error={fieldError(['invalid_email'])} className={at('landscape-short:col-start-1 landscape-short:row-start-1')}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="email"
            dir="ltr"
            autoComplete="email"
            inputMode="email"
            placeholder={t('auth.emailPlaceholder')}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
          />
        )}
      </Field>
      <Field
        label={t('auth.password')}
        error={fieldError(['missing_password', 'weak_password'])}
        className={at('landscape-short:col-start-1 landscape-short:row-start-2')}
      >
        {({ id, describedBy, invalid }) => (
          <PasswordInput
            id={id}
            value={password}
            onChange={setPassword}
            autoComplete={signUp ? 'new-password' : 'current-password'}
            placeholder={t('auth.passwordPlaceholder')}
            describedBy={[describedBy, signUp ? rulesId : null].filter(Boolean).join(' ') || undefined}
            invalid={invalid}
            showLabel={t('auth.showPassword')}
            hideLabel={t('auth.hidePassword')}
          />
        )}
      </Field>
      {signUp && <PasswordRules id={rulesId} password={password} stacked={grid} className={at('landscape-short:col-start-3 landscape-short:row-span-2 landscape-short:row-start-1 landscape-short:mt-0')} />}
      {signUp && (
        <Field
          label={t('auth.confirmPassword')}
          error={fieldError(['password_mismatch'])}
          className={at('landscape-short:col-start-2 landscape-short:row-start-1')}
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              placeholder={t('auth.confirmPlaceholder')}
              describedBy={[describedBy, matchId].filter(Boolean).join(' ')}
              invalid={invalid || (confirm !== '' && confirm !== password)}
              showLabel={t('auth.showConfirm')}
              hideLabel={t('auth.hideConfirm')}
            />
          )}
        </Field>
      )}
      {signUp && <MatchStatus id={matchId} password={password} confirm={confirm} className={at('landscape-short:col-start-2 landscape-short:row-start-2 landscape-short:mt-0 landscape-short:self-start')} />}
      {formError && (
        <p role="alert" className={cn('rounded-2xl bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground', at('landscape-short:col-span-3 landscape-short:row-start-3'))}>
          {formError}
        </p>
      )}
      <div className={cn('flex gap-2', at('landscape-short:col-start-2 landscape-short:row-start-2 landscape-short:self-end'))}>
        <Button type="button" variant="outline" size="lg" className="w-12 px-0" onClick={onBack} aria-label={t('auth.otherOptions')}>
          {backIcon}
        </Button>
        <Button type="submit" size="lg" className="flex-1" disabled={submitDisabled}>
          {busy ? t('auth.working') : t(signUp ? 'auth.submit.signup' : 'auth.submit.signin')}
        </Button>
      </div>
    </form>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  describedBy,
  invalid,
  showLabel,
  hideLabel,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: 'new-password' | 'current-password'
  placeholder: string
  describedBy?: string
  invalid: boolean
  showLabel: string
  hideLabel: string
}) {
  const [show, setShow] = useState(false)
  return (
    // Password text is always left-to-right, so its show/hide button stays on the same side in Arabic.
    <div className="relative" dir="ltr">
      <TextInput
        id={id}
        type={show ? 'text' : 'password'}
        dir="ltr"
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pe-11"
        maxLength={128}
      />
      <button
        type="button"
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        aria-label={show ? hideLabel : showLabel}
        aria-pressed={show}
        onClick={() => setShow((s) => !s)}
      >
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
}

const STRENGTH_STYLE: Record<Exclude<PasswordStrength, 'none'>, { bars: number; tone: string; text: string }> = {
  weak: { bars: 1, tone: 'bg-destructive', text: 'text-destructive' },
  medium: { bars: 2, tone: 'bg-minor', text: 'text-foreground' },
  strong: { bars: 3, tone: 'bg-primary', text: 'text-primary' },
}

/** Live sign-up requirements: icon + text + hidden "Done/Not yet" prefix, so state never relies on colour alone. */
function PasswordRules({ id, password, stacked = false, className }: { id: string; password: string; stacked?: boolean; className?: string }) {
  const { t } = useStore().i18n
  const checks = passwordChecks(password)
  const strength = passwordStrength(password)
  const style = strength === 'none' ? null : STRENGTH_STYLE[strength]
  return (
    <div id={id} className={cn('-mt-1 flex shrink-0 flex-col gap-1.5 short:-mt-0.5 short:gap-1', className)} data-password-strength={strength}>
      <div className="flex items-center gap-2.5">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', style && i < style.bars ? style.tone : 'bg-muted')} />
          ))}
        </div>
        {/* Announced politely only when the level changes, never on every keystroke. */}
        <p aria-live="polite" className={cn('min-w-16 text-end text-xs font-medium', style ? style.text : 'text-muted-foreground')}>
          {style ? t('auth.strength.label', { level: t(`auth.strength.${strength}` as MessageKey) }) : <span className="sr-only">{t('auth.rules.title')}</span>}
        </p>
      </div>
      <ul aria-label={t('auth.rules.title')} className={cn('grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs leading-snug', stacked && 'landscape-short:grid-cols-1 landscape-short:gap-y-1')}>
        {PASSWORD_RULES.map((rule) => {
          const met = checks[rule]
          const Icon = met ? CircleCheck : Circle
          return (
            <li key={rule} data-rule={rule} data-met={met} className={cn('flex items-start gap-1.5', met ? 'text-primary' : 'text-muted-foreground', rule === 'special' && 'col-span-2', stacked && 'landscape-short:col-span-1')}>
              <Icon className="mt-px size-3.5 shrink-0" strokeWidth={met ? 2.5 : 2} aria-hidden />
              <span>
                <span className="sr-only">{t(met ? 'auth.rule.met' : 'auth.rule.unmet')} </span>
                {t(`auth.rule.${rule}` as MessageKey)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MatchStatus({ id, password, confirm, className }: { id: string; password: string; confirm: string; className?: string }) {
  const { t } = useStore().i18n
  const state = confirm === '' ? 'empty' : confirm === password ? 'match' : 'mismatch'
  const Icon = state === 'match' ? CircleCheck : CircleX
  return (
    // Height is reserved so the buttons never jump while typing.
    <p id={id} aria-live="polite" data-match={state} className={cn('-mt-1 flex min-h-4 items-center gap-1.5 text-xs font-medium short:-mt-0.5', state === 'match' ? 'text-primary' : 'text-destructive', className)}>
      {state !== 'empty' && (
        <>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {t(state === 'match' ? 'auth.match.yes' : 'auth.match.no')}
        </>
      )}
    </p>
  )
}
