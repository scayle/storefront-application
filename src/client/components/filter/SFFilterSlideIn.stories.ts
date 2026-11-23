import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import type {
  SortOption,
  AppliedFilters,
  Filter,
} from '@scayle/storefront/types'
import {
  SORT_DATE_NEWEST,
  SORT_PRICE_ASC,
  SORT_PRICE_DESC,
} from '@scayle/storefront/shared'
import type { ImageViewOption } from '@shared/types/ImageView'
import SFButton from '../ui/core/SFButton.vue'
import SFFilterSlideIn from './SFFilterSlideIn.vue'

// The mobile image view group, below sorting. The values are placeholders for
// the shop's `imageType` attribute values.
const imageViewOptions: ImageViewOption[] = [
  { value: 'type-a', label: 'Model' },
  { value: 'type-b', label: 'Flat lay' },
]

/**
 * SFFilterSlideIn provides a slide-in panel for product filtering and sorting options.
 * It includes various filter types like price ranges, attributes, boolean filters,
 * and sorting options with a clean mobile-first interface.
 */
export default {
  title: 'Filter/SFFilterSlideIn',
  component: SFFilterSlideIn,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFFilterSlideIn>) => ({
    components: { SFFilterSlideIn, SFButton },
    setup() {
      const isOpen = ref(false)
      return { args, isOpen }
    },
    template: `
      <div class="w-full max-w-screen-sm flex justify-center">
        <SFButton size="md" @click="isOpen = !isOpen">Toggle filter</SFButton>
        <SFFilterSlideIn v-bind="args" v-model:open="isOpen" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFFilterSlideIn>

type Story = StoryObj<typeof SFFilterSlideIn>

/**
 * Shows the filter slide-in with all available options including sorting and image type selection.
 * Displays the complete filtering interface with various filter types and sorting options.
 */
export const Default: Story = {
  argTypes: {
    hideSorting: {
      control: false,
    },
  },
  args: (() => {
    const sortOptions: SortOption[] = [
      { key: 'newest', config: SORT_DATE_NEWEST },
      { key: 'price_asc', config: SORT_PRICE_ASC },
      { key: 'price_desc', config: SORT_PRICE_DESC },
    ]

    const selectedSort: SortOption = {
      key: 'newest',
      config: SORT_DATE_NEWEST,
    }

    const filters: Filter[] = [
      {
        slug: 'prices',
        name: 'Price',
        type: 'range',
        productCount: 100,
        min: 0,
        max: 1000,
      },
      {
        slug: 'sale',
        name: 'Sale',
        type: 'boolean',
        trueCount: 50,
        falseCount: 50,
      },
      {
        slug: 'size',
        name: 'Size',
        type: 'attributes',
        values: [
          {
            id: '1',
            name: 'Size 1',
            value: '1',
            productCount: 50,
          },
          {
            id: '2',
            name: 'Size 2',
            value: '2',
            productCount: 50,
          },
        ],
      },
      {
        slug: 'color',
        name: 'Color',
        type: 'attributes',
        values: [
          {
            id: '1',
            name: 'Color 1',
            value: 'weiss_1',
            productCount: 50,
          },
          {
            id: '2',
            name: 'Color 2',
            value: 'blau',
            productCount: 50,
          },
        ],
      },
    ]

    const appliedFilter: AppliedFilters = {
      price: { min: 0, max: 1000 },
      attributes: { size: ['1'] },
      booleans: { sale: true },
      count: 3,
    }

    return {
      currentCategoryId: 1,
      hideSorting: false,
      sortOptions,
      selectedSort,
      filters,
      appliedFilter,
      imageViewOptions,
      productListType: 'category',
      productListId: '50342',
    }
  })(),
}

export const Mobile: Story = {
  args: (() => {
    const sortOptions: SortOption[] = [
      { key: 'newest', config: SORT_DATE_NEWEST },
      { key: 'price_asc', config: SORT_PRICE_ASC },
      { key: 'price_desc', config: SORT_PRICE_DESC },
    ]

    const selectedSort: SortOption = {
      key: 'newest',
      config: SORT_DATE_NEWEST,
    }

    return {
      currentCategoryId: 1,
      hideSorting: false,
      sortOptions,
      selectedSort,
      imageViewOptions,
      productListType: 'category',
      productListId: '50342',
    }
  })(),
  globals: {
    viewport: { value: 'mobile2', isRotated: false },
  },
}
