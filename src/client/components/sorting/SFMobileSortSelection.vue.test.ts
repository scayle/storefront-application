import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { SortOption } from '@scayle/storefront/types'

import { SORT_OPTION_LABEL_KEYS } from '@client/utils/sorting'
import SFMobileSortSelection from './SFMobileSortSelection.vue'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({
    path: ref('/c/women-1'),
    query: ref(new URLSearchParams()),
    navigate,
  }),
}))

const sortOptions: SortOption[] = (
  Object.keys(SORT_OPTION_LABEL_KEYS) as SortOption['key'][]
).map((key) => ({ key, config: {} }))

const mountMobileSortSelection = (selectedSort?: SortOption) =>
  mount(SFMobileSortSelection, {
    props: { sortOptions, selectedSort },
    global: { mocks: { $t: (key: string) => key } },
  })

describe('SFMobileSortSelection', () => {
  it('resolves every option label client-side from the sort key via $t', () => {
    const wrapper = mountMobileSortSelection()

    // $t is mocked as identity, so the rendered text is the translation key.
    for (const [key, labelKey] of Object.entries(SORT_OPTION_LABEL_KEYS)) {
      expect(
        wrapper.get(`[data-testid="mobile-sort-item-${key}"]`).text(),
      ).toBe(labelKey)
    }
  })

  it('marks the option matching `selectedSort` by key as pressed', () => {
    const wrapper = mountMobileSortSelection({ ...sortOptions[0]! })

    expect(
      wrapper
        .get('[data-testid="mobile-sort-item-default"]')
        .attributes('aria-pressed'),
    ).toBe('true')
    expect(
      wrapper
        .get('[data-testid="mobile-sort-item-newest"]')
        .attributes('aria-pressed'),
    ).toBe('false')
  })

  it('applies the key of the pressed option', async () => {
    const wrapper = mountMobileSortSelection()

    await wrapper
      .get('[data-testid="mobile-sort-item-price_asc"]')
      .trigger('click')

    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('sort=price_asc'),
      expect.anything(),
    )
  })

  // The props are destructured, so passing `selectedSort` as a plain value
  // would freeze it at setup and a press would compare against a stale key.
  it('does not reapply the sort that a prop change selected', async () => {
    const wrapper = mountMobileSortSelection(sortOptions[0])

    await wrapper.setProps({ selectedSort: sortOptions[1] })
    await wrapper
      .get(`[data-testid="mobile-sort-item-${sortOptions[1]!.key}"]`)
      .trigger('click')

    expect(navigate).not.toHaveBeenCalled()
  })
})
