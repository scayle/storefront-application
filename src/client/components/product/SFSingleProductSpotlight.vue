<template>
  <div ref="spotlightRef">
    <SFProductCard
      v-if="product"
      :product="product"
      product-list-type="product_slider"
      :product-index="0"
      :highlight-override="highlightOverride"
      disable-siblings-picker
      @select-product="onProductSelect"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * The CMS Single Product spotlight. Renders the standard product tile
 * (`SFProductCard`, as on PLPs and sliders). When High Urgency is enabled it
 * takes on the highlighted-deal treatment: colored border, countdown footer,
 * and an optional deal badge. It is driven by the editorial config and shared by the
 * Contentful, Contentstack, and Storyblok Single Product blocks.
 */
import { computed, useTemplateRef, watch } from 'vue'
import { useElementVisibility } from '@vueuse/core'
import type { ListingProduct } from '@scayle/storefront/types'
import SFProductCard from '@client/components/product/SFProductCard.vue'
import type { ProductCardHighlightOverride } from '@client/components/product/productCardHighlight'
import { resolveHighlightColors } from '@client/components/product/productCardHighlight'
import { useProductEvents } from '@client/composables/tracking/useProductEvents'

const {
  product,
  badge,
  highUrgency = false,
  backgroundColor,
  textColor,
  showCountdown = false,
  countdownEndDate,
} = defineProps<{
  /** The product to spotlight. `undefined` while data is loading or when the configured id resolves to no product. */
  product?: ListingProduct
  /** Optional editorial label. Rendered as the deal badge, only in the high-urgency state. */
  badge?: string
  /** Enables the enhanced (highlighted) tile styling and unlocks the color and countdown options. */
  highUrgency?: boolean
  /** HEX background color for the enhanced tile border/footer. Applied only when `highUrgency` is true. */
  backgroundColor?: string
  /** HEX text color for the enhanced tile footer/badge. Applied only when `highUrgency` is true. */
  textColor?: string
  /** Whether to display the countdown timer. Honored only when `highUrgency` is true. */
  showCountdown?: boolean
  /** ISO end date the countdown runs down to. Honored only when `showCountdown` is true. */
  countdownEndDate?: string
}>()

const { trackSelectItem, trackViewItemList, trackViewProductTile } =
  useProductEvents()

// The spotlight is a one-product slider for both pipelines: the spec's
// closed list type vocabulary has no dedicated spotlight surface, and like
// CMS product sliders it has no slider id, so `product_list_id` and
// `item_list_id` stay unset.
const LIST_SURFACE = {
  product_list_type: 'product_slider',
  total: 1,
} as const
const spotlightRef = useTemplateRef<HTMLElement>('spotlightRef')
// A full-width spotlight can be taller than twice the viewport, so half of it
// may never be on screen at once. 30% is the viewability share for large elements.
const isVisible = useElementVisibility(spotlightRef, {
  once: true,
  threshold: 0.3,
})

const hasCountdown = computed(() => showCountdown && !!countdownEndDate)

/**
 * Provides direct highlight values to `SFProductCard` for the high-urgency state.
 * Keeps spotlight config independent from promotion-domain internals.
 */
const highlightOverride = computed<ProductCardHighlightOverride | undefined>(
  () => {
    if (!highUrgency) {
      return undefined
    }

    return {
      color: resolveHighlightColors(backgroundColor, textColor),
      badgeLabel: badge,
      countdownEndDate: hasCountdown.value ? countdownEndDate : undefined,
    }
  },
)

const onProductSelect = () => {
  if (!product) {
    return
  }

  trackSelectItem(product, { index: 1, ...LIST_SURFACE })
}

watch(isVisible, (visible) => {
  if (!visible || !product) {
    return
  }

  trackViewItemList([product], LIST_SURFACE)
  trackViewProductTile(product, { ...LIST_SURFACE, position: 1 })
})
</script>
