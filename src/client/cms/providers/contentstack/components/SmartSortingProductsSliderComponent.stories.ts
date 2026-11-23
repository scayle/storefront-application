import { computed } from 'vue'
import SFProductSkeletonSlider from '@client/components/product/slider/SFProductSkeletonSlider.vue'
import type { SmartSortingProductsSliderComponent as SmartSortingProductsSliderComponentType } from '@shared/types/cms/contentstack'
import SmartSortingProductsSliderComponent from './SmartSortingProductsSliderComponent.vue'

interface SmartSortingProductsSliderStoryArgs {
  display_title?: string
  smart_sorting_key?: SmartSortingProductsSliderComponentType['smart_sorting_key']
  brand_id?: number
  category_id?: number
  limit?: number
}

const createContentElement = (
  display_title?: string,
  smart_sorting_key: SmartSortingProductsSliderComponentType['smart_sorting_key'] = 'scayle:v1:topseller',
  brand_id?: number,
  category_id?: number,
  limit?: number,
): SmartSortingProductsSliderComponentType => ({
  uid: 'smart-sorting-slider-1',
  _content_type_uid: 'smart_sorting_products_slider-component',
  title: 'Smart Sorting Products Slider',
  display_title,
  smart_sorting_key,
  brand_id,
  category_id,
  limit,
})

/**
 * Contentstack Smart Sorting Products Slider displays a horizontal carousel of products
 * with navigation controls and an optional title. It fetches products using smart sorting
 * configuration and renders them using SFProductSlider.
 */
export default {
  title: 'CMS Contentstack/SmartSortingProductsSlider',
  component: SmartSortingProductsSliderComponent,
  argTypes: {
    display_title: {
      control: 'text',
      description: 'Optional title displayed above the product slider',
      name: 'contentElement.display_title',
    },
    smart_sorting_key: {
      control: 'select',
      options: [
        'scayle:v1:sales-push',
        'scayle:v1:new-arrivals',
        'scayle:v1:balanced-offerings',
        'scayle:v1:topseller',
        'scayle:v1:trending',
      ],
      description:
        'Smart sorting algorithm key for automatic product selection',
      name: 'contentElement.smart_sorting_key',
    },
    brand_id: {
      control: 'number',
      description: 'Optional brand ID to limit products',
      name: 'contentElement.brand_id',
    },
    category_id: {
      control: 'number',
      description: 'Optional category ID to limit products',
      name: 'contentElement.category_id',
    },
    limit: {
      control: 'number',
      description: 'Maximum number of products to display',
      name: 'contentElement.limit',
    },
  },
  args: {
    display_title: 'Featured Products',
    smart_sorting_key: 'scayle:v1:topseller',
    limit: 10,
  },
  parameters: {
    docs: {
      story: {
        height: '360px',
      },
      source: {
        code: `
          <template>
            <SmartSortingProductsSliderComponent :contentElement="contentElement" />
          </template>
        `,
      },
    },
  },
  render: (args: SmartSortingProductsSliderStoryArgs) => ({
    components: {
      SmartSortingProductsSliderComponent,
      SFProductSkeletonSlider,
    },
    setup() {
      const contentElement = computed(() =>
        createContentElement(
          args.display_title,
          args.smart_sorting_key ?? 'scayle:v1:topseller',
          args.brand_id,
          args.category_id,
          args.limit,
        ),
      )
      return { contentElement }
    },
    template: `
      <Suspense>
        <SmartSortingProductsSliderComponent :content-element="contentElement" />
        <template #fallback>
          <SFProductSkeletonSlider class="w-full" />
        </template>
      </Suspense>
    `,
  }),
}

/** Default smart sorting slider with title and topseller sorting */
export const Default = {
  args: {
    display_title: 'Featured Products',
    smart_sorting_key: 'scayle:v1:topseller',
    limit: 10,
  },
}

/** Smart sorting slider without a title */
export const WithoutTitle = {
  args: {
    smart_sorting_key: 'scayle:v1:new-arrivals',
    limit: 10,
  },
}
