import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { t } from '@test/mocks/vue-i18n'
import SFWishlistHeadline from './SFWishlistHeadline.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

function mountHeadline(count: number) {
  return mount(SFWishlistHeadline, {
    props: { count, headingId: 'wishlist-title' },
    global: { mocks: { $t: t } },
  })
}

describe('SFWishlistHeadline', () => {
  it('renders an <h1> carrying the heading id', () => {
    const heading = mountHeadline(3).get('[data-testid="wishlist-title"]')

    expect(heading.element.tagName).toBe('H1')
    expect(heading.attributes('id')).toBe('wishlist-title')
  })

  it('shows the item count next to the title', () => {
    const wrapper = mountHeadline(3)

    expect(wrapper.get('[data-testid="headline-item-count"]').text()).toContain(
      'navigation.breadcrumb.item_count(3)',
    )
  })

  it('shows no item count for an empty wishlist', () => {
    const wrapper = mountHeadline(0)

    expect(wrapper.text()).not.toContain('navigation.breadcrumb.item_count')
  })
})
