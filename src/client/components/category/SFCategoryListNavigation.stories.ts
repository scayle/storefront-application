import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import type { CategoryListNavigationItem } from '@scayle/storefront/types'
import SFCategoryListNavigation from './SFCategoryListNavigation.vue'

/**
 * SFCategoryListNavigation displays a horizontal scrollable list of category navigation items.
 * It renders category chips inside a slider, highlighting the currently active category.
 *
 * Used on mobile product listing pages to provide quick navigation between sibling
 * or child categories without taking up vertical space.
 */
export default {
  title: 'Category/SFCategoryListNavigation',
  component: SFCategoryListNavigation,
  render: (args: ComponentPropsAndSlots<typeof SFCategoryListNavigation>) => ({
    components: { SFCategoryListNavigation },
    setup() {
      return { args }
    },
    template: `
      <div class="w-full max-w-screen-lg">
        <SFCategoryListNavigation v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFCategoryListNavigation>

type Story = StoryObj<typeof SFCategoryListNavigation>

const buildCategories = (): CategoryListNavigationItem[] => {
  return [
    { name: 'Dresses', path: '/women/clothing/dresses', isActive: false },
    { name: 'Shoes', path: '/women/clothing/shoes', isActive: true },
    {
      name: 'Accessories',
      path: '/women/clothing/accessories',
      isActive: false,
    },
    {
      name: 'Summer Dresses',
      path: '/women/clothing/summer-dresses',
      isActive: false,
    },
    {
      name: 'Evening Dresses',
      path: '/women/clothing/evening-dresses',
      isActive: false,
    },
    {
      name: 'Casual Dresses',
      path: '/women/clothing/casual-dresses',
      isActive: false,
    },
  ]
}

const buildScrollableCategories = (): CategoryListNavigationItem[] => {
  return [
    {
      name: 'Summer Dresses',
      path: '/women/clothing/summer-dresses',
      isActive: false,
    },
    {
      name: 'Evening Dresses',
      path: '/women/clothing/evening-dresses',
      isActive: true,
    },
    {
      name: 'Casual Dresses',
      path: '/women/clothing/casual-dresses',
      isActive: false,
    },
    {
      name: 'Tops & Blouses',
      path: '/women/clothing/tops-blouses',
      isActive: false,
    },
    {
      name: 'Pants & Jeans',
      path: '/women/clothing/pants-jeans',
      isActive: false,
    },
    { name: 'Skirts', path: '/women/clothing/skirts', isActive: false },
    {
      name: 'Jackets & Coats',
      path: '/women/clothing/jackets-coats',
      isActive: false,
    },
    { name: 'Activewear', path: '/women/clothing/activewear', isActive: false },
    {
      name: 'Lingerie & Sleepwear',
      path: '/women/clothing/lingerie-sleepwear',
      isActive: false,
    },
    { name: 'Swimwear', path: '/women/clothing/swimwear', isActive: false },
  ]
}

/**
 * Shows the category list navigation with a small set of categories.
 * Displays category chips with one active category highlighted.
 */
export const Default: Story = {
  args: {
    categories: buildCategories(),
  },
}

/**
 * Shows the category list navigation with many categories to demonstrate horizontal scrolling.
 * Includes 10 categories to showcase the slider's scrollable behavior.
 */
export const Scrollable: Story = {
  args: {
    categories: buildScrollableCategories(),
  },
}
