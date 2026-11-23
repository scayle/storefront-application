import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SFHeadlineItemCount from './SFHeadlineItemCount.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

describe('SFHeadlineItemCount', () => {
  it('renders the pluralized count in parentheses, hidden from assistive tech', () => {
    const wrapper = mount(SFHeadlineItemCount, { props: { count: 34 } })

    const visible = wrapper.get('[data-testid="headline-item-count"]')
    expect(visible.text()).toBe('(navigation.breadcrumb.item_count(34))')
    expect(visible.attributes('aria-hidden')).toBe('true')
  })

  it('renders an sr-only pluralized count for assistive tech', () => {
    const wrapper = mount(SFHeadlineItemCount, { props: { count: 1 } })

    expect(wrapper.get('.sr-only').text()).toBe(
      'navigation.breadcrumb.item_count(1)',
    )
  })

  it('renders nothing while the count is undefined', () => {
    const wrapper = mount(SFHeadlineItemCount, { props: {} })

    expect(wrapper.find('[data-testid="headline-item-count"]').exists()).toBe(
      false,
    )
    expect(wrapper.find('.sr-only').exists()).toBe(false)
  })

  it('renders a zero count rather than hiding it', () => {
    const wrapper = mount(SFHeadlineItemCount, { props: { count: 0 } })

    expect(wrapper.get('[data-testid="headline-item-count"]').text()).toBe(
      '(navigation.breadcrumb.item_count(0))',
    )
  })
})
