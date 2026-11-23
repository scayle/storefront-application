<template>
  <SFProductSlider
    v-if="products.length > 0"
    class="w-full"
    data-testid="recently-viewed-products-slider"
    :products="products"
    :title="$t('recentlyViewedProductsSlider.title')"
    :product-list-id="ProductSliderIds.RecentlyViewed"
  />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRecentlyViewedProducts } from '@client/composables/useRecentlyViewedProducts'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import { ProductSliderIds } from '@shared/types/Tracking'

/**
 * Displays the products the current user has previously viewed in a horizontal
 * slider. Reads the persisted product ids from localStorage via
 * `useRecentlyViewedProducts` and lazy-loads the missing product data on mount.
 *
 * Used by the CMS provider wrappers (Contentful, Storyblok, Contentstack) and
 * the Product Detail page. Pass spacing utilities via `class` if the consumer
 * needs additional padding or margins around the slider.
 *
 * @example
 * <SFRecentlyViewedProductSlider class="mt-12" />
 */
const { loadMissingProducts, products } = useRecentlyViewedProducts()

onMounted(() => {
  loadMissingProducts()
})
</script>
