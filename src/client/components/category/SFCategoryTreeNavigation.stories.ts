import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import type { CategoryTreeNavigationNode } from '@scayle/storefront/types'
import SFCategoryTreeNavigation from './SFCategoryTreeNavigation.vue'

/**
 * SFCategoryTreeNavigation displays a hierarchical category tree in a sidebar format.
 * It shows root categories with their children, highlighting the current category
 * and indicating active categories with special styling.
 *
 * Used as the desktop sidebar navigation on product listing pages to allow users
 * to browse and navigate through the full category hierarchy.
 */
export default {
  title: 'Category/SFCategoryTreeNavigation',
  component: SFCategoryTreeNavigation,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFCategoryTreeNavigation>) => ({
    components: { SFCategoryTreeNavigation },
    setup() {
      return { args }
    },
    template: `
      <div class="w-full max-w-80 h-96 overflow-y-auto border border-gray-200 rounded-lg p-6">
        <SFCategoryTreeNavigation v-bind="args" class="!h-auto" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFCategoryTreeNavigation>

type Story = StoryObj<typeof SFCategoryTreeNavigation>

const buildTree = (): CategoryTreeNavigationNode[] => {
  return [
    {
      name: 'Women',
      path: '/women',
      isActive: false,
      depth: 1,
      children: [
        {
          name: 'Clothing',
          path: '/women/clothing',
          isActive: true,
          depth: 2,
          children: [
            {
              name: 'Dresses',
              path: '/women/clothing/dresses',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Shoes',
              path: '/women/clothing/shoes',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Accessories',
              path: '/women/clothing/accessories',
              isActive: false,
              depth: 3,
              children: [],
            },
          ],
        },
      ],
    },
    {
      name: 'Men',
      path: '/men',
      isActive: false,
      depth: 1,
      children: [
        {
          name: 'Clothing',
          path: '/men/clothing',
          isActive: false,
          depth: 2,
          children: [
            {
              name: 'Dresses',
              path: '/men/clothing/dresses',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Shoes',
              path: '/men/clothing/shoes',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Accessories',
              path: '/men/clothing/accessories',
              isActive: false,
              depth: 3,
              children: [],
            },
          ],
        },
      ],
    },
  ]
}

const buildLargerTree = (): CategoryTreeNavigationNode[] => {
  return [
    {
      name: 'Women',
      path: '/women',
      isActive: false,
      depth: 1,
      children: [
        {
          name: 'Clothing',
          path: '/women/clothing',
          isActive: true,
          depth: 2,
          children: [
            {
              name: 'Dresses',
              path: '/women/clothing/dresses',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Tops & Blouses',
              path: '/women/clothing/tops-blouses',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Pants & Jeans',
              path: '/women/clothing/pants-jeans',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Skirts',
              path: '/women/clothing/skirts',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Jackets & Coats',
              path: '/women/clothing/jackets-coats',
              isActive: false,
              depth: 3,
              children: [],
            },
          ],
        },
        {
          name: 'Shoes',
          path: '/women/shoes',
          isActive: false,
          depth: 2,
          children: [
            {
              name: 'Heels',
              path: '/women/shoes/heels',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Flats',
              path: '/women/shoes/flats',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Boots',
              path: '/women/shoes/boots',
              isActive: false,
              depth: 3,
              children: [],
            },
          ],
        },
        {
          name: 'Accessories',
          path: '/women/accessories',
          isActive: false,
          depth: 2,
          children: [
            {
              name: 'Bags',
              path: '/women/accessories/bags',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Jewelry',
              path: '/women/accessories/jewelry',
              isActive: false,
              depth: 3,
              children: [],
            },
          ],
        },
      ],
    },
    {
      name: 'Men',
      path: '/men',
      isActive: false,
      depth: 1,
      children: [
        {
          name: 'Clothing',
          path: '/men/clothing',
          isActive: false,
          depth: 2,
          children: [
            {
              name: 'Shirts',
              path: '/men/clothing/shirts',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Pants & Jeans',
              path: '/men/clothing/pants-jeans',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Jackets & Coats',
              path: '/men/clothing/jackets-coats',
              isActive: false,
              depth: 3,
              children: [],
            },
          ],
        },
        {
          name: 'Shoes',
          path: '/men/shoes',
          isActive: false,
          depth: 2,
          children: [
            {
              name: 'Sneakers',
              path: '/men/shoes/sneakers',
              isActive: false,
              depth: 3,
              children: [],
            },
            {
              name: 'Dress Shoes',
              path: '/men/shoes/dress-shoes',
              isActive: false,
              depth: 3,
              children: [],
            },
          ],
        },
      ],
    },
  ]
}

/**
 * Sale branches as the Storefront API reports them: the sale marker sits on the
 * sale category and on every category below it. One branch starts at the root
 * ("Sale"), the other one level down ("Women > Sale").
 */
const buildSaleTree = (): CategoryTreeNavigationNode[] => {
  return [
    {
      name: 'Women',
      path: '/women',
      isActive: false,
      depth: 1,
      children: [
        {
          name: 'Clothing',
          path: '/women/clothing',
          isActive: false,
          depth: 2,
          children: [],
        },
        {
          name: 'Sale',
          path: '/women/sale',
          isActive: false,
          depth: 2,
          isSale: true,
          children: [
            {
              name: 'Clothing',
              path: '/women/sale/clothing',
              isActive: false,
              depth: 3,
              isSale: true,
              children: [],
            },
          ],
        },
      ],
    },
    {
      name: 'Sale',
      path: '/sale',
      isActive: true,
      depth: 1,
      isSale: true,
      children: [
        {
          name: 'Tops',
          path: '/sale/tops',
          isActive: false,
          depth: 2,
          isSale: true,
          children: [],
        },
        {
          name: 'Jackets & Coats',
          path: '/sale/jackets-coats',
          isActive: false,
          depth: 2,
          isSale: true,
          children: [],
        },
      ],
    },
  ]
}

/**
 * Shows the category tree navigation with a hierarchical category tree.
 * Displays root categories with their children and highlights the current active category (Clothing).
 */
export const Default: Story = {
  args: {
    categories: buildTree(),
  },
}

/**
 * Shows the category tree navigation with a larger category tree to demonstrate scrolling.
 * Includes more categories across multiple levels to showcase the vertical scrolling behavior.
 */
export const WithScrolling: Story = {
  name: 'With scrolling',
  args: {
    categories: buildLargerTree(),
  },
}

/**
 * Shows the sale color marking where a sale branch starts, no matter which level
 * it starts on. The root "Sale" category and "Women > Sale" are highlighted; the
 * sale subcategories below them keep the default color.
 */
export const WithSaleCategories: Story = {
  name: 'With sale categories',
  args: {
    categories: buildSaleTree(),
  },
}
