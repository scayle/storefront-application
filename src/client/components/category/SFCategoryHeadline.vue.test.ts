import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockCategory } from '@test/mock-data/categories'
import SFCategoryHeadline from './SFCategoryHeadline.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const category = createMockCategory({ name: 'Pants' })

describe('SFCategoryHeadline', () => {
  it('renders the category name as a visible h1', () => {
    const wrapper = mount(SFCategoryHeadline, {
      props: { category },
    })

    const headline = wrapper.get('[data-testid="active-category-breadcrumb"]')
    expect(headline.element.tagName).toBe('H1')
    expect(headline.text()).toContain('Pants')
  })

  it('renders the product count when productsCount is provided', () => {
    const wrapper = mount(SFCategoryHeadline, {
      props: { category, productsCount: 34 },
    })

    expect(wrapper.get('[data-testid="headline-item-count"]').text()).toBe(
      '(navigation.breadcrumb.item_count(34))',
    )
  })

  it('hides the product count while listing data is loading', () => {
    const wrapper = mount(SFCategoryHeadline, {
      props: { category },
    })

    expect(wrapper.find('[data-testid="headline-item-count"]').exists()).toBe(
      false,
    )
  })

  it('puts the count for screen readers inside the h1', () => {
    const wrapper = mount(SFCategoryHeadline, {
      props: { category, productsCount: 1 },
    })

    expect(wrapper.get('h1 .sr-only').text()).toBe(
      'navigation.breadcrumb.item_count(1)',
    )
  })
})
