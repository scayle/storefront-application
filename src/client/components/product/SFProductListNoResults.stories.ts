import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { AppliedFilters, Category } from '@scayle/storefront/types'
import SFProductListNoResults from './SFProductListNoResults.vue'

const category: Category = {
  id: 42,
  name: 'Women Shoes',
  link: '/c/women-shoes-42',
  depth: 0,
  isSale: false,
  defaultSortingOption: { key: 'default', config: {} },
  breadcrumbs: [],
}

const noFilters: AppliedFilters = { attributes: {}, booleans: {}, count: 0 }

const colorFilter: AppliedFilters = {
  attributes: { color: ['red'] },
  booleans: {},
  count: 1,
}

/**
 * SFProductListNoResults is the default message of `SFProductGrid` when a
 * category listing returns no products. The search page passes
 * `SFSearchNoResults` instead. Below the message it offers a way out:
 *
 * - "Back to <category>" when the grid lists a category, linking to it.
 * - "Reset filters" when filters are applied, removing all of them.
 */
export default {
  title: 'Product/SFProductListNoResults',
  component: SFProductListNoResults,
  args: {
    category,
    appliedFilters: noFilters,
    productListType: 'category',
  },
  argTypes: {
    category: { control: false },
    appliedFilters: { control: false },
  },
} satisfies Meta<typeof SFProductListNoResults>

type Story = StoryObj<typeof SFProductListNoResults>

/** An empty category without filters: the message and a link back to the category. */
export const InCategory: Story = {}

/** An empty category with filters applied: both the back link and "Reset filters". */
export const InCategoryWithFilters: Story = {
  args: { appliedFilters: colorFilter },
}
