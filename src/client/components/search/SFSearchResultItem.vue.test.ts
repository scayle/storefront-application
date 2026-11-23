import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SFSearchResultItem from './SFSearchResultItem.vue'

const SFLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to', 'raw'],
}

const mountItem = (props: Record<string, unknown> = {}) =>
  mount(SFSearchResultItem, {
    props: { to: '/p/x', id: 'search-result-product-1', ...props },
    slots: { default: 'Result' },
    global: { stubs: { SFLink: SFLinkStub } },
  })

describe('SFSearchResultItem', () => {
  it('keeps the option link out of the tab order (tabindex="-1")', () => {
    // The search combobox drives selection via aria-activedescendant, so the
    // input stays the single tab stop and options are reached with the arrow
    // keys — not Tab.
    expect(mountItem().get('a').attributes('tabindex')).toBe('-1')
  })

  it('marks the link selected only when its id is the active descendant', () => {
    expect(
      mountItem({ activeId: 'search-result-product-1' })
        .get('a')
        .attributes('data-selected'),
    ).toBe('true')
    expect(
      mountItem({ activeId: 'other' }).get('a').attributes('data-selected'),
    ).toBeUndefined()
  })
})
