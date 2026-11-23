import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createMockCategorySuggestion } from '../../../test/mock-data/search'
import SFCategorySuggestion from './SFCategorySuggestion.vue'

const breadcrumbs = [
  { id: 1, value: 'Women' },
  { id: 2, value: 'Clothing' },
]

/**
 * SFCategorySuggestion is the category row in the search suggestions under the
 * header search field. It shows the category name, the path to it as
 * breadcrumbs above the name, and a tag for each filter the search resolved,
 * such as `Color: Black` for the term "black jackets". The row links to the
 * category with those filters applied.
 *
 * The accessible name reads the breadcrumbs, the name and the filters in one
 * sentence, since the visual layout splits them over three lines.
 */
export default {
  title: 'Search/SFCategorySuggestion',
  component: SFCategorySuggestion,
  parameters: { layout: 'centered' },
  args: {
    suggestion: createMockCategorySuggestion({
      id: 12,
      name: 'Jackets',
      link: '/c/women/clothing/jackets-12',
      breadcrumbs,
    }),
  },
  argTypes: {
    suggestion: { control: false },
  },
  render: (args) => ({
    components: { SFCategorySuggestion },
    setup() {
      return { args }
    },
    template: `
      <div class="w-96">
        <SFCategorySuggestion v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFCategorySuggestion>

type Story = StoryObj<typeof SFCategorySuggestion>

/** A nested category with its breadcrumbs above the name. */
export const Default: Story = {}

/** A top-level category: no breadcrumbs, only the name. */
export const TopLevel: Story = {
  args: {
    suggestion: createMockCategorySuggestion({
      id: 1,
      name: 'Women',
      link: '/c/women-1',
    }),
  },
}

/** A category with filters the search term resolved to, shown as tags. */
export const WithFilters: Story = {
  args: {
    suggestion: createMockCategorySuggestion({
      id: 12,
      name: 'Jackets',
      link: '/c/women/clothing/jackets-12',
      breadcrumbs,
      filters: [
        { key: 'color', label: 'Color', values: ['Black'] },
        { key: 'size', label: 'Size', values: ['S', 'M'] },
      ],
    }),
  },
}

/** The active suggestion during keyboard navigation, highlighted with a border and background. */
export const Active: Story = {
  args: {
    activeId: 'search-result-category-12',
  },
}
