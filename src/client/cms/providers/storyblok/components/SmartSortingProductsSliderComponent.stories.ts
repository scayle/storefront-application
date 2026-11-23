import { computed } from 'vue'
import SFProductSkeletonSlider from '@client/components/product/slider/SFProductSkeletonSlider.vue'
import type { SmartSortingProductsSliderComponent as SmartSortingProductsSliderComponentType } from '@shared/types/cms/storyblok'
import SmartSortingProductsSliderComponent from './SmartSortingProductsSliderComponent.vue'

interface SmartSortingProductSliderStoryArgs {
  title?: string
  smartSortingKey?:
    | 'scayle:v1:sales-push'
    | 'scayle:v1:new-arrivals'
    | 'scayle:v1:balanced-offerings'
    | 'scayle:v1:inventory-optimization'
    | 'scayle:v1:luxury-promotion'
    | 'scayle:v1:stock-coverage'
    | 'scayle:v1:topseller'
    | 'scayle:v1:revenue-max'
    | 'scayle:v1:recently-popular'
    | 'scayle:v1:trending'
  brandId?: string
  categoryId?: string
  limit?: string
}

const createContentElement = (
  smartSortingKey: SmartSortingProductSliderStoryArgs['smartSortingKey'] = 'scayle:v1:topseller',
  title?: string,
  brandId?: string,
  categoryId?: string,
  limit?: string,
): SmartSortingProductsSliderComponentType => ({
  smartSortingKey,
  title,
  brandId,
  categoryId,
  limit,
  component: 'SmartSortingProductsSliderComponent',
  _uid: 'smart-sorting-products-slider-story-uid',
})

/**
 * Storyblok Smart Sorting Products Slider displays a horizontal carousel of products
 * with an optional title. It fetches products using smart sorting keys and renders them with SFProductSlider.
 */
export default {
  title: 'CMS Storyblok/SmartSortingProductsSlider',
  component: SmartSortingProductsSliderComponent,
  argTypes: {
    title: {
      control: 'text',
      description: 'Optional title displayed above the product slider',
      name: 'contentElement.title',
    },
    smartSortingKey: {
      control: 'select',
      description: 'The smart sorting key to use.',
      options: [
        'scayle:v1:sales-push',
        'scayle:v1:new-arrivals',
        'scayle:v1:balanced-offerings',
        'scayle:v1:inventory-optimization',
        'scayle:v1:luxury-promotion',
        'scayle:v1:stock-coverage',
        'scayle:v1:topseller',
        'scayle:v1:revenue-max',
        'scayle:v1:recently-popular',
        'scayle:v1:trending',
      ],
      name: 'contentElement.smartSortingKey',
    },
    brandId: {
      control: 'text',
      description: 'The brand id to filter by.',
      name: 'contentElement.brandId',
    },
    categoryId: {
      control: 'text',
      description: 'The category id to filter by.',
      name: 'contentElement.categoryId',
    },
    limit: {
      control: 'text',
      description: 'The limit of amount of products to show.',
      name: 'contentElement.limit',
    },
  },
  args: {
    title: 'Top Seller Products',
    smartSortingKey: 'scayle:v1:topseller',
    brandId: undefined,
    categoryId: undefined,
    limit: '10',
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
  render: (args: SmartSortingProductSliderStoryArgs) => ({
    components: {
      SmartSortingProductsSliderComponent,
      SFProductSkeletonSlider,
    },
    setup() {
      const contentElement = computed(() =>
        createContentElement(
          args.smartSortingKey ?? 'scayle:v1:topseller',
          args.title,
          args.brandId,
          args.categoryId,
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

/** Default smart sorting slider with title and topseller key */
export const Default = {
  args: {
    title: 'Top Seller Products',
    smartSortingKey: 'scayle:v1:topseller',
    brandId: undefined,
    categoryId: undefined,
    limit: '10',
  },
}

/** Smart sorting slider filtered by brand */
export const WithFilteredBrand = {
  args: {
    title: 'Top Seller Products',
    smartSortingKey: 'scayle:v1:topseller',
    brandId: '505',
    categoryId: undefined,
    limit: '10',
  },
}

/** Smart sorting slider filtered by category */
export const WithFilteredCategory = {
  args: {
    smartSortingKey: 'scayle:v1:topseller',
    categoryId: '100',
  },
}
