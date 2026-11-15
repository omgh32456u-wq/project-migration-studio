
import { useId, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1 rounded-2xl bg-muted p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded-xl px-3 font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ring',
              size === 'sm' ? 'min-h-8 text-xs' : 'min-h-10 text-sm',
              active ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-11 w-full appearance-none rounded-xl border border-input bg-card ps-3 pe-9 text-sm outline-none transition-[color,border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
  className?: string
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errId = `${id}-err`
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-sm outline-none transition-[color,border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

/** Decimal-friendly input; parent keeps the raw string so partial input like "1." is preserved. */
export function NumberInput(props: Omit<ComponentProps<'input'>, 'type'>) {
  return <TextInput type="text" inputMode="decimal" autoComplete="off" dir="ltr" {...props} className={cn('tabular-nums', props.className)} />
}

export function Chip({ active, className, ...props }: ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.97]',
        active ? 'border-primary bg-primary text-primary-foreground shadow-glow' : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent',
        className,
      )}
      {...props}
    />
  )
}

/** Base surface. `hero` is the deep logo-green gradient used for the Today summary; `flat` drops the shadow for nested cards. */
export function Card({ className, variant = 'default', ...props }: ComponentProps<'section'> & { variant?: 'default' | 'hero' | 'flat' }) {
  return (
    <section
      className={cn(
        'rounded-2xl text-card-foreground',
        variant === 'default' && 'border bg-card shadow-soft',
        variant === 'flat' && 'border bg-card',
        variant === 'hero' && 'surface-hero shadow-lift',
        className,
      )}
      {...props}
    />
  )
}

export function Badge({ tone = 'neutral', className, ...props }: ComponentProps<'span'> & { tone?: 'neutral' | 'primary' | 'warning' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
        tone === 'primary' && 'bg-accent text-accent-foreground',
        tone === 'warning' && 'bg-warning text-warning-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground ring-8 ring-accent/40" aria-hidden>
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-balance">{title}</p>
        {body && <p className="max-w-sm text-sm text-pretty text-muted-foreground">{body}</p>}
      </div>
      {action}
    </div>
  )
}

export function Notice({ tone = 'muted', icon, children, className }: { tone?: 'muted' | 'warning'; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
        tone === 'warning' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 [&_svg]:size-3.5">{icon}</span>}
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function PageHeader({ title, actions, children }: { title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 pb-4">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
