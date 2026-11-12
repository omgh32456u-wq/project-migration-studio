
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Radio-style option card used by language and age-group choices.
 * Uniform selected state: brand border, accent fill, and a trailing check
 * (not color alone) so selection is unmistakable in both themes.
 */
export function OptionCard({
  value,
  checked,
  label,
  hint,
  radioLabel,
  onChange,
  icon,
  lang,
}: {
  value: string
  checked: boolean
  label: string
  hint?: string
  radioLabel: string
  onChange: (v: string) => void
  icon?: ReactNode
  lang?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label}
      lang={lang}
      onClick={() => onChange(value)}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border-2 px-4 text-start text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        checked ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-card hover:bg-muted',
      )}
    >
      {icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground [&_svg]:size-5">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col py-3">
        <span className="truncate font-semibold">{label}</span>
        {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
        )}
        aria-hidden
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="4">
            <path d="M4 12l5 5 11-11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  )
}