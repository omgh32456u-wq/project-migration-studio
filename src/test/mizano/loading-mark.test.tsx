import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ARCH_PATH, ARCH_SHIFT, HINGE_ORIGIN } from '@/components/common/brand-mark'
import { LoadingMark } from '@/components/common/loading-mark'
import { OnboardingDayStart } from '@/components/shell/onboarding-wheels-panel'

describe('loading M mark', () => {
  it('shows the message visibly below the outline M, not the square app tile', () => {
    const { container } = render(<LoadingMark label="Loading" />)
    const status = screen.getByRole('status')
    const message = screen.getByText('Loading')
    expect(status.textContent).toBe('Loading')
    expect(message.className).not.toContain('sr-only')
    expect(container.querySelector('img')).toBeNull()
    const mark = container.querySelector('[data-animated]')!
    expect(mark.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('animates the two halves as separate elements, each turning around the shared hinge', () => {
    const { container } = render(<LoadingMark label="Loading" />)
    const halves = [...container.querySelectorAll<SVGElement>('[data-half]')]
    expect(halves.map((h) => h.dataset.half)).toEqual(['lime', 'white'])
    expect(halves[0].getAttribute('class')).toContain('animate-m-half-b')
    expect(halves[1].getAttribute('class')).toContain('animate-m-half-a')
    for (const h of halves) expect(h.style.transformOrigin).toBe(HINGE_ORIGIN)
  })

  it('puts the hinge midway between the two arches so a half-turn lands each arch on the other', () => {
    const archCentre = (179 + 558) / 2
    const hingeX = 160 + (parseFloat(HINGE_ORIGIN) / 100) * 704
    expect(hingeX).toBeCloseTo(archCentre + ARCH_SHIFT / 2, 6)
    expect(2 * hingeX - archCentre).toBeCloseTo(archCentre + ARCH_SHIFT, 6)
  })

  it('shifts the lime arch exactly onto the white arch’s right leg so the halves stay joined', () => {
    const nums = ARCH_PATH.match(/-?\d+(\.\d+)?/g)!.map(Number)
    const leftLegOuter = nums[0]
    const rightLegInner = 466.5
    expect(ARCH_PATH).toContain(`${rightLegInner} 716.5V450.5`)
    expect(leftLegOuter + ARCH_SHIFT).toBe(rightLegInner)
  })
})

describe('onboarding day start', () => {
  const t = (k: string) => k

  it('describes the time input with the previous-day rule', () => {
    render(<OnboardingDayStart value={0} onChange={() => {}} t={t} />)
    const input = screen.getByLabelText('onboarding.dayStart.short')
    const note = document.getElementById(input.getAttribute('aria-describedby')!)
    expect(note?.textContent).toBe('onboarding.dayStart.note')
  })

  it('saves the chosen time as minutes after midnight', () => {
    const onChange = vi.fn()
    render(<OnboardingDayStart value={0} onChange={onChange} t={t} />)
    fireEvent.change(screen.getByLabelText('onboarding.dayStart.short'), { target: { value: '04:30' } })
    expect(onChange).toHaveBeenCalledWith(270)
  })
})
