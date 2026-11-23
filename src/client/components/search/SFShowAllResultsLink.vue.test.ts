import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { SHOW_ALL_RESULTS_ID } from '@client/composables/useSearchSuggestionNavigation'
import SFShowAllResultsLink from './SFShowAllResultsLink.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const SFLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to', 'raw'],
}

const mountLink = (props: Record<string, unknown> = {}) =>
  mount(SFShowAllResultsLink, {
    props: { searchTerm: 'shoe', to: '/search?q=shoe', ...props },
    global: { stubs: { SFLink: SFLinkStub } },
  })

describe('SFShowAllResultsLink', () => {
  it('keeps the link out of the tab order (tabindex="-1")', () => {
    // Matches the aria-activedescendant combobox: the search input is the single
    // tab stop, options — including "show all" — are reached with the arrow keys.
    expect(mountLink().get('a').attributes('tabindex')).toBe('-1')
  })

  it('links to the search results page', () => {
    expect(mountLink().get('a').attributes('href')).toBe('/search?q=shoe')
  })

  it('marks itself selected only when it is the active descendant', () => {
    expect(
      mountLink({ activeId: SHOW_ALL_RESULTS_ID })
        .get('a')
        .attributes('data-selected'),
    ).toBe('true')
    expect(
      mountLink({ activeId: 'other' }).get('a').attributes('data-selected'),
    ).toBeUndefined()
  })
})
