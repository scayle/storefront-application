import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { provide } from 'vue'
import type { GroupedSearchSuggestions } from '@scayle/storefront/types'
import { storybookRpcClient, succeed } from '../../../../../.storybook/rpc-mock'
import { RPC_CLIENT_KEY } from '../../../utils/orpc'
import { createMockListingProduct } from '../../../../test/mock-data/products'
import {
  createMockCategorySuggestion,
  createMockProductSuggestion,
  createMockNavigationItemSuggestion,
} from '../../../../test/mock-data/search'
import SFSearchField from './SFSearchField.vue'

/**
 * SFSearchField is the main search input with debounced suggestions, keyboard navigation,
 * and a results overlay. It includes full accessibility support (combobox pattern,
 * aria-activedescendant, aria-live announcements).
 */
const meta = {
  title: 'UI/Form/SFSearchField',
  component: SFSearchField,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SFSearchField>

export default meta
type Story = StoryObj<typeof meta>

const answerSuggestions =
  (suggestions: GroupedSearchSuggestions): Decorator =>
  () => ({
    setup() {
      provide(RPC_CLIENT_KEY, {
        ...storybookRpcClient,
        search: {
          ...storybookRpcClient.search,
          getSuggestions: () => succeed(suggestions),
        },
      })
    },
    template: '<story />',
  })

const typeSearchTerm = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement)
  await userEvent.type(canvas.getByRole('combobox'), 'sneaker')
  return canvas
}

/**
 * Default collapsed state.
 * The input expands on focus and shows the cancel button.
 */
export const Default: Story = {}

/**
 * Search field with suggestion results visible.
 * Shows categories (with filter chips), products, and navigation items.
 * The field is fully interactive — type, navigate with arrow keys, press Escape to close.
 */
export const WithSuggestions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await typeSearchTerm(canvasElement)
    await expect(await canvas.findByText('Air Max 90')).toBeVisible()
  },
  decorators: [
    answerSuggestions({
      categories: [
        createMockCategorySuggestion({
          id: 1,
          name: 'Sneaker',
          link: '/c/sneaker-1',
        }),
        createMockCategorySuggestion({
          id: 2,
          name: 'Running Shoes',
          link: '/c/running-shoes-2?filters[color]=1',
          filters: [{ key: 'color', label: 'Color', values: ['Black'] }],
        }),
      ],
      products: [
        createMockProductSuggestion({
          product: createMockListingProduct({
            id: 1,
            name: 'Air Max 90',
            brand: 'Nike',
          }),
        }),
        createMockProductSuggestion({
          product: createMockListingProduct({
            id: 2,
            name: 'Ultraboost',
            brand: 'Adidas',
          }),
        }),
      ],
      navigationItems: [
        createMockNavigationItemSuggestion({
          id: 1,
          name: 'Sale',
          link: '/sale',
        }),
      ],
      showAllResultsLink: '/search?filters[term]=sneaker',
    }),
  ],
}

/**
 * Search field showing the no-results state.
 * Only the "See all results" link is visible in the overlay.
 */
export const NoResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await typeSearchTerm(canvasElement)
    await expect(await canvas.findByTestId('no-result')).toBeVisible()
  },
  decorators: [
    answerSuggestions({
      categories: [],
      products: [],
      navigationItems: [],
      showAllResultsLink: '/search?filters[term]=sneaker',
    }),
  ],
}
