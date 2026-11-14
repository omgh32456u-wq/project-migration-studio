import { useId, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mail, MailCheck, Smartphone, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { validateEmailCredentials, type AuthErrorCode, type AuthMode } from '@/lib/account'
import type { MessageKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useAccount } from './account-provider'
import { GoogleMark } from './provider-icons'

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
  const noticeId = useId()
  const signUp = mode === 'sign_up'
  const verb = signUp ? 'signup' : 'signin'
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft

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
    <div className={cn('flex shrink-0 flex-col gap-2', fill && 'mt-auto roomy:mt-2 landscape-short:col-start-1 landscape-short:row-start-2 landscape-short:self-end')}>
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
      {note}
    </div>
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        fill && 'min-h-0 flex-1 landscape-short:grid landscape-short:grid-cols-2 landscape-short:grid-rows-[auto_1fr] landscape-short:gap-x-6',
      )}
      data-auth-mode={mode}
    >
      {renderHeader && <div className={cn(fill && 'landscape-short:col-start-1 landscape-short:row-start-1')}>{renderHeader(title, hint)}</div>}
      <div className={cn('flex flex-col gap-3', fill && 'landscape-short:col-start-2 landscape-short:row-span-2 landscape-short:row-start-1 landscape-short:justify-center')}>

      {view === 'options' && (
        <div className="flex shrink-0 flex-col gap-2" aria-describedby={notice ? noticeId : undefined}>
          <ProviderButton icon={<GoogleMark />} label={t(`auth.${verb}.google` as MessageKey)} onClick={() => void google()} disabled={busy} />
          <ProviderButton tone="apple" label={t(`auth.${verb}.apple` as MessageKey)} disabled aside={t('auth.comingLater')} />
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
          onBack={() => {
            setNotice(null)
            setView('options')
          }}
          backIcon={<Back aria-hidden />}
          onNeedsConfirmation={(email) => {
            setSentTo(email)
            setView('confirm')
          }}
        />
      )}

      {view === 'confirm' && (
        <div className="flex shrink-0 flex-col items-center gap-3 rounded-2xl bg-muted px-4 py-4 text-center">
          <MailCheck className="size-6 text-primary" aria-hidden />
          <Button variant="outline" onClick={() => switchMode('sign_in')}>
            {t('auth.toSignIn')}
          </Button>
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
  onBack,
  backIcon,
  onNeedsConfirmation,
}: {
  mode: AuthMode
  onBack: () => void
  backIcon: ReactNode
  onNeedsConfirmation: (email: string) => void
}) {
  const { t } = useStore().i18n
  const account = useAccount()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<AuthErrorCode | null>(null)
  const [busy, setBusy] = useState(false)
  const signUp = mode === 'sign_up'

  const submit = async () => {
    const invalid = validateEmailCredentials(mode, email, password)
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
        if (!r.ok) setError(r.error)
      }
    } catch {
      setError('network')
    } finally {
      setBusy(false)
    }
  }

  const fieldError = (codes: AuthErrorCode[]) => (error && codes.includes(error) ? t(`auth.error.${error}` as MessageKey) : null)
  const formError = error && !['invalid_email', 'missing_password', 'weak_password'].includes(error) ? t(`auth.error.${error}` as MessageKey) : null

  return (
    <form
      className="flex shrink-0 flex-col gap-3"
      noValidate
      aria-label={t(signUp ? 'auth.signup.email' : 'auth.signin.email')}
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Field label={t('auth.email')} error={fieldError(['invalid_email'])}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="email"
            dir="ltr"
            autoComplete="email"
            inputMode="email"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
          />
        )}
      </Field>
      <Field label={t('auth.password')} hint={signUp ? t('auth.passwordHint') : undefined} error={fieldError(['missing_password', 'weak_password'])}>
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <TextInput
              id={id}
              type={show ? 'text' : 'password'}
              dir="ltr"
              autoComplete={signUp ? 'new-password' : 'current-password'}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pe-11"
              maxLength={128}
            />
            <button
              type="button"
              className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              aria-label={t(show ? 'auth.hidePassword' : 'auth.showPassword')}
              aria-pressed={show}
              onClick={() => setShow((s) => !s)}
            >
              {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        )}
      </Field>
      {formError && (
        <p role="alert" className="rounded-2xl bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="lg" className="w-12 px-0" onClick={onBack} aria-label={t('auth.otherOptions')}>
          {backIcon}
        </Button>
        <Button type="submit" size="lg" className="flex-1" disabled={busy}>
          {busy ? t('auth.working') : t(signUp ? 'auth.submit.signup' : 'auth.submit.signin')}
        </Button>
      </div>
    </form>
  )
}
