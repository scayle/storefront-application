import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createMockNavigationItemSuggestion } from '../../../test/mock-data/search'
import SFNavigationItemSuggestion from './SFNavigationItemSuggestion.vue'

/**
 * SFNavigationItemSuggestion is the page row in the search suggestions under
 * the header search field, for navigation items such as a content or service
 * page. It shows the page name with every word of the search term set in semibold and
 * links to the page.
 */
export default {
  title: 'Search/SFNavigationItemSuggestion',
  component: SFNavigationItemSuggestion,
  parameters: { layout: 'centered' },
  args: {
    suggestion: createMockNavigationItemSuggestion({
      id: 7,
      name: 'Shipping and returns',
      link: '/content/shipping-and-returns',
    }),
    searchTerm: 'returns',
  },
  argTypes: {
    suggestion: { control: false },
  },
  render: (args) => ({
    components: { SFNavigationItemSuggestion },
    setup() {
      return { args }
    },
    template: `
      <div class="w-96">
        <SFNavigationItemSuggestion v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFNavigationItemSuggestion>

type Story = StoryObj<typeof SFNavigationItemSuggestion>

/** The page name with the matching word of the search term set in semibold. */
export const Default: Story = {}

/** A search term of several words: each one is highlighted wherever it appears. */
export const MultipleWords: Story = {
  args: { searchTerm: 'shipping returns' },
}

/** The active suggestion during keyboard navigation, highlighted with a border and background. */
export const Active: Story = {
  args: { activeId: 'search-result-nav-7' },
}
