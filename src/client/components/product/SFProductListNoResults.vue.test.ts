import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import type { AppliedFilters } from '@scayle/storefront/types'
import { useFilter } from '@client/composables/useFilter'
import { t } from '@test/mocks/vue-i18n'
import SFProductListNoResults from './SFProductListNoResults.vue'

vi.mock('@client/composables/useFilter', () => ({
  useFilter: vi.fn(() => ({ resetAllFilters: vi.fn() })),
}))

const appliedFilters: AppliedFilters = {
  attributes: { color: ['1'] },
  booleans: {},
  count: 1,
}

describe('SFProductListNoResults', () => {
  it('hands the grid surface to useFilter, so the reset reports its removals', () => {
    shallowMount(SFProductListNoResults, {
      props: {
        appliedFilters,
        productListType: 'category',
        productListId: '50342',
      },
      global: { mocks: { $t: t } },
    })

    const surface = vi.mocked(useFilter).mock.calls[0]?.[1]

    expect(typeof surface === 'function' && surface()).toEqual({
      product_list_type: 'category',
      product_list_id: '50342',
    })
  })
})
