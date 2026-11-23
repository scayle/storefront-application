import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { toValue } from 'vue'
import type { SortOption } from '@scayle/storefront/types'

import { useSorting } from '@client/composables/useSorting'
import { SORT_OPTION_LABEL_KEYS } from '@client/utils/sorting'
import SFSortSelection from './SFSortSelection.vue'

vi.mock('@client/directives/popover', () => ({
  vPopover: {
    mounted() {},
    getSSRProps() {
      return {}
    },
  },
}))

vi.mock('@client/composables/useDefaultBreakpoints', () => ({
  useDefaultBreakpoints: () => ({
    smaller: () => ({ value: false }),
  }),
}))

const { applySort } = vi.hoisted(() => ({ applySort: vi.fn() }))

vi.mock('@client/composables/useSorting', () => ({
  useSorting: vi.fn(() => ({ applySort })),
}))

vi.mock('@assets/icons/navigation/down.svg', () => ({
  default: { name: 'IconChevronDown', template: '<svg />' },
}))

vi.mock('@assets/icons/notify/alert.svg', () => ({
  default: { name: 'IconAlert', template: '<svg />' },
}))

vi.mock('@assets/icons/checkmark/default.svg', () => ({
  default: {
    name: 'IconCheckmarkDefault',
    template: '<svg data-testid="checkmark" />',
  },
}))

const sortOptions: SortOption[] = (
  Object.keys(SORT_OPTION_LABEL_KEYS) as SortOption['key'][]
).map((key) => ({ key, config: {} }))

const mountSortSelection = (selectedSort?: SortOption) =>
  mount(SFSortSelection, {
    props: { sortOptions, selectedSort },
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        // The options panel uses a `<Transition>`; render its slot directly so
        // the option list is queryable without animation lifecycle.
        Transition: { template: '<div><slot /></div>' },
      },
    },
  })

describe('SFSortSelection', () => {
  it('marks the option matching `selectedSort` by key, not object identity', () => {
    // Inertia serializes `selectedSort` and `sortOptions` independently, so on
    // the client the selected option is a structurally-equal but referentially
    // distinct object from the matching list entry. Cloning the entry here
    // reproduces that post-hydration state; an identity check (`item ===
    // modelValue`) would fail to highlight it and cause a hydration mismatch.
    const detachedSelected: SortOption = { ...sortOptions[0]! }
    const wrapper = mountSortSelection(detachedSelected)

    const selected = wrapper.get('[data-testid="sort-item-default"]')
    expect(selected.attributes('aria-selected')).toBe('true')
    expect(selected.find('[data-testid="checkmark"]').exists()).toBe(true)

    const other = wrapper.get('[data-testid="sort-item-price_asc"]')
    expect(other.attributes('aria-selected')).toBe('false')
    expect(other.find('[data-testid="checkmark"]').exists()).toBe(false)
  })

  it('resolves every option label client-side from the sort key via $t', () => {
    const wrapper = mountSortSelection({ ...sortOptions[0]! })

    // $t is mocked as identity, so the rendered text is the translation key.
    for (const [key, labelKey] of Object.entries(SORT_OPTION_LABEL_KEYS)) {
      expect(wrapper.get(`[data-testid="sort-item-${key}"]`).text()).toContain(
        labelKey,
      )
    }
  })

  it('marks no option when `selectedSort` is undefined', () => {
    const wrapper = mountSortSelection()

    for (const option of sortOptions) {
      const item = wrapper.get(`[data-testid="sort-item-${option.key}"]`)
      expect(item.attributes('aria-selected')).toBe('false')
      expect(item.find('[data-testid="checkmark"]').exists()).toBe(false)
    }
  })

  it('applies the key of the picked option', async () => {
    const wrapper = mountSortSelection()

    await wrapper.get('[data-testid="sort-item-price_asc"]').trigger('click')

    expect(applySort).toHaveBeenCalledWith('price_asc')
  })

  // The props are destructured, so passing `selectedSort` as a plain value
  // would freeze it at setup and `applySort` would compare against a stale key.
  it('hands useSorting the current `selectedSort` after a prop change', async () => {
    const wrapper = mountSortSelection(sortOptions[0])
    const [selectedSort] = vi.mocked(useSorting).mock.lastCall!

    await wrapper.setProps({ selectedSort: sortOptions[1] })

    expect(toValue(selectedSort)).toEqual(sortOptions[1])
  })
})
