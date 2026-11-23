import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CategoryTreeNavigationNode } from '@scayle/storefront/types'
import SFCategoryTreeNavigation from './SFCategoryTreeNavigation.vue'

const buildNode = (name: string, depth = 1): CategoryTreeNavigationNode => ({
  name,
  depth,
  path: `/c/${name.toLowerCase()}`,
  isActive: false,
  isSale: false,
  children: [],
})

const mountNavigation = () =>
  mount(SFCategoryTreeNavigation, {
    props: { categories: [buildNode('Shoes'), buildNode('Bags')] },
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        SFCategoryTreeNavigationNode: {
          props: ['node'],
          template: '<span>{{ node.name }}</span>',
        },
      },
    },
  })

describe('SFCategoryTreeNavigation', () => {
  it('renders one named navigation landmark and no complementary landmark', () => {
    const wrapper = mountNavigation()

    expect(wrapper.element.tagName).toBe('DIV')
    expect(wrapper.find('aside').exists()).toBe(false)
    expect(wrapper.findAll('nav')).toHaveLength(1)
    expect(wrapper.get('nav').attributes('aria-label')).toBe(
      'navigation.a11y.category_navigation',
    )
  })

  it('renders one list item per root category', () => {
    const wrapper = mountNavigation()

    expect(wrapper.get('[data-testid="root-category-0"]').text()).toBe('Shoes')
    expect(wrapper.get('[data-testid="root-category-1"]').text()).toBe('Bags')
  })
})
