import { cn } from '@/lib/utils'

/**
 * The Mizano logo: the original leaf-and-stem glyph from /public/icons/icon.svg on its brand-green tile.
 * Kept as inline SVG so it scales crisply and needs no extra request.
 */
export function BrandMark({ className, glyphClassName }: { className?: string; glyphClassName?: string }) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-[28%] bg-[linear-gradient(145deg,#2a8160,#1d6b4f_55%,#175741)] text-[#fbfaf5] shadow-soft ring-1 ring-white/10',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className={cn('size-[58%]', glyphClassName)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    </span>
  )
}
