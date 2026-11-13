import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ARCH_PATH, ARCH_SHIFT } from '@/components/common/brand-mark'
import { LoadingMark } from '@/components/common/loading-mark'
import { OnboardingDayStart } from '@/components/shell/onboarding-wheels-panel'

describe('loading M mark', () => {
  it('announces loading and shows the outline M, not the square app tile', () => {
    const { container } = render(<LoadingMark label="Loading" />)
    expect(screen.getByRole('status').textContent).toBe('Loading')
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg[data-animated]')).not.toBeNull()
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
