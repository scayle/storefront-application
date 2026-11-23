import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { highlightSearchTerm } from '@client/utils/highlightSearchTerm'
import { createMockNavigationItemSuggestion } from '@test/mock-data/search'
import SFNavigationItemSuggestion from './SFNavigationItemSuggestion.vue'

const SFLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to', 'raw', 'variant', 'target'],
}

describe('SFNavigationItemSuggestion', () => {
  it('renders the navigation item name', () => {
    const suggestion = createMockNavigationItemSuggestion({ name: 'Home' })
    const wrapper = mount(SFNavigationItemSuggestion, {
      props: { suggestion },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    expect(wrapper.text()).toContain('Home')
  })

  it('renders the correct link', () => {
    const suggestion = createMockNavigationItemSuggestion({
      name: 'About',
      link: '/about',
    })
    const wrapper = mount(SFNavigationItemSuggestion, {
      props: { suggestion },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    expect(wrapper.find('a').attributes('href')).toBe('/about')
  })

  it('renders the name with the search term highlighted', () => {
    const suggestion = createMockNavigationItemSuggestion({ name: 'Homepage' })
    const wrapper = mount(SFNavigationItemSuggestion, {
      props: { suggestion, searchTerm: 'ome' },
      global: { stubs: { SFLink: SFLinkStub } },
    })

    // highlightSearchTerm owns the markup; this checks the name and term reach it.
    expect(wrapper.get('a').element.innerHTML).toContain(
      highlightSearchTerm('Homepage', 'ome'),
    )
  })
})
