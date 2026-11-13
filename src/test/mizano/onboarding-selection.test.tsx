import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Wheel, type WheelItem } from '@/components/shell/onboarding-wheel'
import { ActivitySelect, SexSelect } from '@/components/shell/onboarding-pickers'

const t = (k: string) => k
const items: WheelItem[] = Array.from({ length: 10 }, (_, i) => ({ value: i, label: String(i) }))
const selectedOption = () => screen.getAllByRole('option').filter((o) => o.getAttribute('aria-selected') === 'true')

beforeAll(() => {
  // jsdom has no element scrolling; store scrollTop so the wheel can read it back.
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = function (this: Element, opts?: ScrollToOptions | number) {
      if (typeof opts === 'object' && opts.top !== undefined) this.scrollTop = opts.top
    } as Element['scrollTo']
  }
})
afterEach(() => vi.useRealTimers())

describe('onboarding wheel selection feedback', () => {
  it('highlights the centred row while the wheel is still scrolling', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(<Wheel items={items} value={2} onChange={onChange} label="Age" />)
    const list = screen.getByRole('listbox')
    list.scrollTop = 5 * 40
    fireEvent.scroll(list)
    expect(selectedOption().map((o) => o.textContent)).toEqual(['5'])
    expect(onChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(200))
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('follows a new value from the parent', () => {
    const { rerender } = render(<Wheel items={items} value={2} onChange={() => {}} label="Age" />)
    rerender(<Wheel items={items} value={7} onChange={() => {}} label="Age" />)
    expect(selectedOption().map((o) => o.textContent)).toEqual(['7'])
  })
})

describe('onboarding choice chips', () => {
  it('marks only the chosen sex as checked', () => {
    const { rerender } = render(<SexSelect value="male" onChange={() => {}} t={t} />)
    rerender(<SexSelect value="female" onChange={() => {}} t={t} />)
    const checked = screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')
    expect(checked.map((r) => r.textContent)).toEqual(['settings.sex.female'])
  })

  it('marks only the chosen activity level as checked', () => {
    const { rerender } = render(<ActivitySelect value={null} onChange={() => {}} t={t} />)
    rerender(<ActivitySelect value="active" onChange={() => {}} t={t} />)
    const checked = screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')
    expect(checked.map((r) => r.getAttribute('aria-label'))).toEqual(['activity.active'])
  })
})
