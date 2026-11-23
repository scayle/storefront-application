<template>
  <!--
    Mobile reuses the product slider; desktop lays the same products out as a
    two-column grid that scrolls beneath the sticky upper section.
  -->
  <SFProductSlider
    v-if="!isDesktop"
    :products="visibleProducts"
    :title="$t('add_to_basket_slide_in.recommendations_title')"
    :product-list-id="ProductSliderIds.Trending"
    :item-list-id="TrackingItemListIds.AddToBasketRecommendations"
    data-testid="add-to-basket-slide-in-recommendations-slider"
  />
  <section
    v-else
    ref="gridRef"
    :aria-labelledby="headingId"
    data-testid="add-to-basket-slide-in-recommendations-grid"
  >
    <h2 :id="headingId" class="mb-6 truncate heading-section-1">
      {{ $t('add_to_basket_slide_in.recommendations_title') }}
    </h2>
    <ul class="grid grid-cols-2 gap-4">
      <li v-for="(product, index) in visibleProducts" :key="product.id">
        <SFProductCard
          :product="product"
          product-list-type="product_slider"
          :product-list-id="ProductSliderIds.Trending"
          :product-index="index"
          disable-image-slider
          @intersect-product="onProductIntersects(product, index)"
          @select-product="onProductSelect(product, index)"
        />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'
import { useElementVisibility } from '@vueuse/core'
import type { ListingProduct } from '@scayle/storefront/types'
import SFProductCard from '@client/components/product/SFProductCard.vue'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import { useProductSliderTracking } from '@client/composables/tracking/useProductSliderTracking'
import { useDefaultBreakpoints } from '@client/composables/useDefaultBreakpoints'
import { ProductSliderIds, TrackingItemListIds } from '@shared/types/Tracking'

/** Products the design allots to the section: three rows of two on desktop. */
const RECOMMENDATION_COUNT = 6

const { products } = defineProps<{
  /** Candidate recommendations, trimmed to the first {@link RECOMMENDATION_COUNT}. */
  products: ListingProduct[]
}>()

const breakpoints = useDefaultBreakpoints()
const isDesktop = breakpoints.greaterOrEqual('lg')
const headingId = useId()
const gridRef = useTemplateRef<HTMLElement>('gridRef')
const isGridVisible = useElementVisibility(gridRef, { once: true })

const visibleProducts = computed(() => products.slice(0, RECOMMENDATION_COUNT))

// The slider tracks itself; this covers the desktop grid only, under the same
// surface so the recommendations report identically whichever layout the
// breakpoint picks.
//
// SCAYLE Analytics identifies the panel by its products, the trending set, so
// it shares `trending` with the PDP slider it opens over. GA4 gets the panel's
// own `item_list_id`: one add would otherwise report the same list twice, with
// the same products at the same positions.
const { onProductIntersects, onProductSelect } = useProductSliderTracking(
  visibleProducts,
  {
    productListId: ProductSliderIds.Trending,
    itemListId: TrackingItemListIds.AddToBasketRecommendations,
    isVisible: isGridVisible,
  },
)
</script>
