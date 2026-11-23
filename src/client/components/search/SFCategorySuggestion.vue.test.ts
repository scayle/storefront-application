import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockCategorySuggestion } from '@test/mock-data/search'
import SFCategorySuggestion from './SFCategorySuggestion.vue'

const SFLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to', 'raw', 'variant', 'target'],
}

describe('SFCategorySuggestion', () => {
  it('renders the category link', () => {
    const suggestion = createMockCategorySuggestion({
      link: '/c/shoes-42',
    })
    const wrapper = mount(SFCategorySuggestion, {
      props: { suggestion },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    expect(wrapper.find('a').attributes('href')).toBe('/c/shoes-42')
  })

  it('renders filter tags when filters are present', () => {
    const suggestion = createMockCategorySuggestion({
      filters: [
        { key: 'color', label: 'Color', values: ['Red', 'Blue'] },
        { key: 'size', label: 'Size', values: ['M'] },
      ],
    })
    const wrapper = mount(SFCategorySuggestion, {
      props: { suggestion },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    expect(
      wrapper.find('[data-testid="search-suggestion-tag-group"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="search-suggestion-tag-0"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="search-suggestion-tag-1"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="search-suggestion-tag-2"]').exists(),
    ).toBe(true)
  })

  it('does not render filter tags when filters are empty', () => {
    const suggestion = createMockCategorySuggestion({ filters: [] })
    const wrapper = mount(SFCategorySuggestion, {
      props: { suggestion },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    expect(
      wrapper.find('[data-testid="search-suggestion-tag-group"]').exists(),
    ).toBe(false)
  })

  it('builds an aria-label from hierarchy (breadcrumbs + name) and filters', () => {
    const suggestion = createMockCategorySuggestion({
      name: 'Sneakers',
      breadcrumbs: [
        { id: 1, value: 'Women' },
        { id: 2, value: 'Shoes' },
      ],
      filters: [
        { key: 'color', label: 'Color', values: ['Red', 'Blue'] },
        { key: 'size', label: 'Size', values: ['M'] },
      ],
    })
    const wrapper = mount(SFCategorySuggestion, {
      props: { suggestion },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    expect(wrapper.find('a').attributes('aria-label')).toBe(
      'Women, Shoes, Sneakers; Color: Red; Color: Blue; Size: M',
    )
  })

  it('renders a separator between breadcrumbs but not after the last one', () => {
    const suggestion = createMockCategorySuggestion({
      breadcrumbs: [
        { id: 1, value: 'Women' },
        { id: 2, value: 'Shoes' },
        { id: 3, value: 'Sneakers' },
      ],
    })
    const wrapper = mount(SFCategorySuggestion, {
      props: { suggestion },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    expect(
      wrapper.findAll('[data-testid="search-suggestion-breadcrumb-separator"]'),
    ).toHaveLength(2)
  })

  it('does not render a separator for a single breadcrumb', () => {
    const suggestion = createMockCategorySuggestion({
      breadcrumbs: [{ id: 1, value: 'Women' }],
    })
    const wrapper = mount(SFCategorySuggestion, {
      props: { suggestion },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    expect(
      wrapper
        .find('[data-testid="search-suggestion-breadcrumb-separator"]')
        .exists(),
    ).toBe(false)
  })

  it('omits breadcrumb hierarchy from the aria-label when there are no breadcrumbs', () => {
    const suggestion = createMockCategorySuggestion({
      name: 'Shoes',
      breadcrumbs: [],
      filters: [],
    })
    const wrapper = mount(SFCategorySuggestion, {
      props: { suggestion },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    // No breadcrumbs and no filters — hierarchy collapses to the name and
    // the filter segment is empty.
    expect(wrapper.find('a').attributes('aria-label')).toBe('Shoes')
  })
})
