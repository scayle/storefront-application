import { describe, it, expect, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { mount } from '@vue/test-utils'
import { LowStockIndicatorSize } from '@client/utils/constants'
import SFLowStockBanner from './SFLowStockBanner.vue'

describe('SFLowStockBanner.vue', () => {
  it('renders the visual banner and announces the message in a live region', () => {
    const wrapper = mount(SFLowStockBanner, {
      props: { message: 'Only a few items left!' },
    })

    const banner = wrapper.find('[data-testid="low-stock-banner"]')
    const announcer = wrapper.find('[data-testid="low-stock-banner-announcer"]')

    expect(banner.exists()).toBe(true)
    expect(banner.element.tagName).toBe('P')
    expect(banner.text()).toBe('Only a few items left!')
    expect(announcer.attributes('role')).toBe('status')
    expect(announcer.attributes('aria-atomic')).toBe('true')
    expect(announcer.text()).toBe('Only a few items left!')
  })

  it.each([
    { label: 'empty string', message: '' as string | undefined },
    { label: 'undefined', message: undefined },
  ])(
    'keeps the live region mounted when the message is $label',
    ({ message }) => {
      const wrapper = mount(SFLowStockBanner, {
        props: { message },
      })

      expect(wrapper.find('[data-testid="low-stock-banner"]').exists()).toBe(
        false,
      )

      const announcer = wrapper.find(
        '[data-testid="low-stock-banner-announcer"]',
      )
      expect(announcer.exists()).toBe(true)
      expect(announcer.attributes('role')).toBe('status')
      expect(announcer.text()).toBe('')
    },
  )

  // Compares the two sizes instead of naming their utilities, so restyling
  // either size keeps the test green while a size that stops applying fails it.
  it('styles the banner differently at the small size than at the default size', () => {
    const bannerClasses = (size?: LowStockIndicatorSize) =>
      mount(SFLowStockBanner, {
        props: { message: 'Only 5 items left!', size },
      })
        .get('[data-testid="low-stock-banner"]')
        .classes()

    expect(bannerClasses(LowStockIndicatorSize.SMALL)).not.toEqual(
      bannerClasses(),
    )
  })

  describe('attribute fallthrough', () => {
    const extraneousAttrsWarnings = (warn: MockInstance<typeof console.warn>) =>
      warn.mock.calls.filter((call) =>
        String(call[0]).includes('Extraneous non-props attributes'),
      )

    it('applies fallthrough classes to the visual banner, not the live region', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const wrapper = mount(SFLowStockBanner, {
        props: { message: 'Only a few items left!' },
        attrs: { class: 'mt-3' },
      })

      expect(
        wrapper.find('[data-testid="low-stock-banner"]').classes(),
      ).toContain('mt-3')
      expect(
        wrapper.find('[data-testid="low-stock-banner-announcer"]').classes(),
      ).not.toContain('mt-3')
      expect(extraneousAttrsWarnings(warn)).toEqual([])
    })

    it('does not warn about extraneous attributes while the banner is hidden', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mount(SFLowStockBanner, {
        props: { message: undefined },
        attrs: { class: 'mt-3' },
      })

      expect(extraneousAttrsWarnings(warn)).toEqual([])
    })
  })
})
