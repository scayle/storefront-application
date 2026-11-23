import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createMockListingProduct } from '../../../test/mock-data/products'
import {
  createMockCategorySuggestion,
  createMockNavigationItemSuggestion,
  createMockProductSuggestion,
} from '../../../test/mock-data/search'
import SFCategorySuggestion from './SFCategorySuggestion.vue'
import SFNavigationItemSuggestion from './SFNavigationItemSuggestion.vue'
import SFProductSuggestion from './SFProductSuggestion.vue'
import SFSuggestionGroup from './SFSuggestionGroup.vue'

const categories = [
  createMockCategorySuggestion({
    id: 12,
    name: 'Jackets',
    link: '/c/women/clothing/jackets-12',
    breadcrumbs: [
      { id: 1, value: 'Women' },
      { id: 2, value: 'Clothing' },
    ],
  }),
  createMockCategorySuggestion({
    id: 34,
    name: 'Jackets',
    link: '/c/men/clothing/jackets-34',
    breadcrumbs: [
      { id: 3, value: 'Men' },
      { id: 4, value: 'Clothing' },
    ],
  }),
]

const product = createMockProductSuggestion({
  product: createMockListingProduct({ siblings: [] }),
})

const navigationItem = createMockNavigationItemSuggestion({
  id: 7,
  name: 'Jacket care guide',
  link: '/content/jacket-care-guide',
})

/**
 * SFSuggestionGroup is one titled list in the search suggestions under the
 * header search field: a heading with the number of rows next to it, then the
 * rows. `SFSearchResultsContainer` renders one group per suggestion type
 * (categories, products, pages), each row wrapped in an `<li>` passed through
 * the default slot.
 */
export default {
  title: 'Search/SFSuggestionGroup',
  component: SFSuggestionGroup,
  parameters: { layout: 'centered' },
  args: {
    title: 'Categories',
    count: categories.length,
  },
  render: (args) => ({
    components: { SFSuggestionGroup, SFCategorySuggestion },
    setup() {
      return { args, categories }
    },
    template: `
      <div class="w-96">
        <SFSuggestionGroup v-bind="args">
          <li v-for="suggestion in categories" :key="suggestion.id">
            <SFCategorySuggestion :suggestion="suggestion" />
          </li>
        </SFSuggestionGroup>
      </div>
    `,
  }),
} satisfies Meta<typeof SFSuggestionGroup>

type Story = StoryObj<typeof SFSuggestionGroup>

/** A group of one suggestion type, as the search suggestions render it. */
export const Default: Story = {}

/**
 * One row of each type in a single group, to compare their heights and
 * spacing side by side. The live search never mixes types in one group.
 */
export const MixedRows: Story = {
  args: { title: 'Suggestions', count: 3 },
  render: (args) => ({
    components: {
      SFSuggestionGroup,
      SFCategorySuggestion,
      SFProductSuggestion,
      SFNavigationItemSuggestion,
    },
    setup() {
      return { args, category: categories[0], product, navigationItem }
    },
    template: `
      <div class="w-96">
        <SFSuggestionGroup v-bind="args">
          <li><SFCategorySuggestion :suggestion="category" /></li>
          <li><SFProductSuggestion :suggestion="product" /></li>
          <li><SFNavigationItemSuggestion :suggestion="navigationItem" search-term="jacket" /></li>
        </SFSuggestionGroup>
      </div>
    `,
  }),
}
