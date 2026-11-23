import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import type { Category } from '@scayle/storefront/types'
import SFCategoryHeadline from './SFCategoryHeadline.vue'

/**
 * SFCategoryHeadline renders the visible page title on product listing pages.
 * It shows the active category name and, once listing data resolves, the total
 * product count in parentheses.
 */
export default {
  title: 'Category/SFCategoryHeadline',
  component: SFCategoryHeadline,
  render: (args: ComponentPropsAndSlots<typeof SFCategoryHeadline>) => ({
    components: { SFCategoryHeadline },
    setup() {
      return { args }
    },
    template: `
      <div class="max-w-screen-lg p-4">
        <SFCategoryHeadline v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFCategoryHeadline>

type Story = StoryObj<typeof SFCategoryHeadline>

const category: Category = {
  id: 42,
  name: 'Pants',
  link: '/c/pants-42',
  depth: 2,
  isSale: false,
  defaultSortingOption: { key: 'default', config: {} },
  breadcrumbs: [
    { id: 1, value: 'Women', to: '/c/women-1' },
    { id: 2, value: 'Clothing', to: '/c/clothing-2' },
  ],
}

/** Category title without a product count (listing still loading). */
export const WithoutCount: Story = {
  args: { category },
}

/** Category title with the resolved product count. */
export const WithCount: Story = {
  args: { category, productsCount: 34 },
}
