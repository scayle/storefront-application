import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { SFButtonStub } from '@test/stubs/common'
import SFBreadcrumb from './SFBreadcrumb.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const globalConfig = {
  stubs: {
    IconChevronRight: {
      template: '<svg data-testid="breadcrumb-separator" />',
    },
    SFButton: SFButtonStub,
  },
}

const items = [
  { value: 'Home', to: '/' },
  { value: 'Category', to: '/c/category' },
  { value: 'Product', to: '/p/product' },
]

describe('SFBreadcrumb', () => {
  it('renders the trail as an ordered list inside a labelled nav landmark', () => {
    const wrapper = mount(SFBreadcrumb, {
      props: { items },
      global: globalConfig,
    })

    const nav = wrapper.find('nav')
    expect(nav.attributes('aria-label')).toBe('navigation.a11y.breadcrumb')
    expect(nav.find('ol').exists()).toBe(true)
  })

  it('renders a separator between items but not after the last one', () => {
    const wrapper = mount(SFBreadcrumb, {
      props: { items },
      global: globalConfig,
    })

    expect(
      wrapper.findAll('[data-testid="breadcrumb-separator"]'),
    ).toHaveLength(items.length - 1)
  })

  it('renders the last item as the current page when lastAsCurrent is set', () => {
    const wrapper = mount(SFBreadcrumb, {
      props: { items, lastAsCurrent: true },
      global: globalConfig,
    })

    const last = wrapper.find(
      `[data-testid="breadcrumb-item-${items.length - 1}"]`,
    )
    expect(last.element.tagName).toBe('SPAN')
    expect(last.attributes('aria-current')).toBe('page')
  })

  it('keeps the last item interactive when lastAsCurrent is false', () => {
    const wrapper = mount(SFBreadcrumb, {
      props: { items, lastAsCurrent: false },
      global: globalConfig,
    })

    const last = wrapper.find(
      `[data-testid="breadcrumb-item-${items.length - 1}"]`,
    )
    expect(last.attributes('aria-current')).toBeUndefined()
    expect(last.element.tagName).toBe('A')
  })

  // The first item and the last `maxItems - 2` items stay, with at least one
  // item after the ellipsis. `0` and a trail no longer than `maxItems` turn
  // the collapse off.
  it.for([
    { maxItems: 4, expected: ['A', '…', 'D', 'E'] },
    { maxItems: 2, expected: ['A', '…', 'E'] },
    { maxItems: 5, expected: ['A', 'B', 'C', 'D', 'E'] },
    { maxItems: 0, expected: ['A', 'B', 'C', 'D', 'E'] },
  ])(
    'renders $expected for a five-item trail with maxItems $maxItems',
    ({ maxItems, expected }) => {
      const longTrail = ['A', 'B', 'C', 'D', 'E'].map((value) => ({
        value,
        to: `/${value.toLowerCase()}`,
      }))
      const wrapper = mount(SFBreadcrumb, {
        props: { items: longTrail, maxItems },
        global: globalConfig,
      })

      expect(wrapper.findAll('li').map((li) => li.text())).toEqual(expected)
    },
  )

  it('renders the meta count in parentheses on the current crumb', () => {
    const withMeta = [
      { value: 'Home', to: '/' },
      { value: 'Category', meta: '42 items' },
    ]
    const wrapper = mount(SFBreadcrumb, {
      props: { items: withMeta, lastAsCurrent: true },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="breadcrumb-current-meta"]').text()).toBe(
      '(42 items)',
    )
  })

  it('renders a last item without a target as plain text without meta when lastAsCurrent is false', () => {
    const withMeta = [
      { value: 'Home', to: '/' },
      { value: 'Category', meta: '42 items' },
    ]
    const wrapper = mount(SFBreadcrumb, {
      props: { items: withMeta, lastAsCurrent: false },
      global: globalConfig,
    })

    const last = wrapper.find(
      `[data-testid="breadcrumb-item-${withMeta.length - 1}"]`,
    )
    expect(last.element.tagName).toBe('SPAN')
    expect(last.attributes('aria-current')).toBeUndefined()
    expect(
      wrapper.find('[data-testid="breadcrumb-current-meta"]').exists(),
    ).toBe(false)
  })
})
