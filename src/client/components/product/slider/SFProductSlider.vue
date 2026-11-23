<template>
  <!--
    Labelled region (not `aria-roledescription="carousel"` — this is a list
    of recommendations, not a one-at-a-time widget). Skip-links book-end the
    focusable content, hidden until focused.
  -->
  <section ref="regionRef" :aria-labelledby="headingId" class="relative">
    <SFItemSlider
      ref="sliderRef"
      with-arrows
      slider-ref-node-type="ul"
      @update:active-slide="onSlideChange"
    >
      <template #header>
        <div class="relative">
          <!-- `tabindex="-1"`: focus target for "Skip to beginning", not in tab order. -->
          <h2
            :id="headingId"
            ref="headingRef"
            tabindex="-1"
            class="mb-6 truncate pr-24 heading-section-1"
          >
            <template v-if="title">{{ title }}</template>
            <!-- A CMS block can omit its headline; the region still needs a name. -->
            <span v-else class="sr-only">
              {{ $t('slider.a11y.products_label') }}
            </span>
          </h2>
          <button
            ref="skipToEndRef"
            type="button"
            :class="SKIP_LINK_START_POSITION"
            data-testid="slider-skip-to-end"
            @click="skipToEnd"
          >
            {{ $t('slider.a11y.skip_to_end') }}
          </button>
        </div>
      </template>
      <template
        #arrows="{ isPrevEnabled, isNextEnabled, prev, next, isScrollable }"
      >
        <div
          class="absolute -top-1 right-2 flex gap-px"
          :class="{ hidden: !isScrollable }"
        >
          <SFSliderArrowButton
            direction="previous"
            :disabled="!isPrevEnabled"
            class="rounded-l-full pl-0.5"
            data-testid="slider-arrow-button-left"
            :accessible-label="$t('slider.go_to_previous_item')"
            @click="prev()"
          />
          <SFSliderArrowButton
            direction="next"
            :disabled="!isNextEnabled"
            class="rounded-r-full pr-0.5"
            data-testid="slider-arrow-button-right"
            :accessible-label="$t('slider.go_to_next_item')"
            @click="next()"
          />
        </div>
      </template>
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- Delegates Shift+Tab from the focusable product card inside. The list item is not interactive itself. -->
      <li
        v-for="(product, index) in products"
        :key="product.id"
        class="my-1 w-1/2 shrink-0 snap-start pr-4 lg:w-1/4"
        @keydown.shift.tab="onCardShiftTab($event, index)"
      >
        <SFProductCard
          :product="product"
          product-list-type="product_slider"
          :product-list-id="productListId"
          :product-index="index"
          disable-image-slider
          @intersect-product="onProductIntersects(product, index)"
          @select-product="onProductSelect(product, index)"
        />
      </li>
    </SFItemSlider>
    <!-- Last focusable inside the region; returns focus to the heading. -->
    <button
      type="button"
      :class="SKIP_LINK_END_POSITION"
      data-testid="slider-skip-to-start"
      @click="skipToStart"
    >
      {{ $t('slider.a11y.skip_to_start') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import type { Ref } from 'vue'
import { useElementVisibility } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import {
  useAnnouncer,
  ANNOUNCE_DEBOUNCE_MS,
} from '@client/composables/useAnnouncer'
import type { ListingProduct } from '@scayle/storefront/types'
import SFItemSlider from '@client/components/ui/core/SFItemSlider.vue'
import SFSliderArrowButton from '@client/components/ui/core/SFSliderArrowButton.vue'
import SFProductCard from '@client/components/product/SFProductCard.vue'
import { useProductSliderTracking } from '@client/composables/tracking/useProductSliderTracking'
import type {
  ProductSliderId,
  TrackingItemListId,
} from '@shared/types/Tracking'
import { getFirstFocusable, getFirstFocusableAfter } from '@client/utils/focus'

// Hidden until focused, then revealed as the v2 outlined-button overlay.
const SKIP_LINK_BASE =
  'sr-only focus:not-sr-only focus:absolute focus:top-14 focus:z-20 focus:rounded-lg focus:border focus:border-gray-500 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-md focus-visible:focus-style'
const SKIP_LINK_START_POSITION = `${SKIP_LINK_BASE} focus:left-6`
const SKIP_LINK_END_POSITION = `${SKIP_LINK_BASE} focus:right-6`

const { products, title, productListId, itemListId } = defineProps<{
  /** Products to display in the slider. */
  products: ListingProduct[]
  /**
   * Heading displayed above the slider. When empty, a generic label is
   * announced to screen readers only.
   */
  title: string
  /**
   * Slider id sent as the SCAYLE Analytics `product_list_id` and the GA4
   * `item_list_id`, next to the `product_slider` list type. Omitted for
   * sliders the tracking specification has no id for, such as CMS product
   * sliders.
   */
  productListId?: ProductSliderId
  /**
   * GA4 `item_list_id` that replaces `productListId` on the GA4 events, for a
   * slider GA4 has to tell apart from another slider with the same id.
   */
  itemListId?: TrackingItemListId
}>()

const { t } = useI18n()
const { announce } = useAnnouncer()

const regionRef = useTemplateRef<HTMLElement>('regionRef')
const headingRef = useTemplateRef<HTMLHeadingElement>('headingRef')
const skipToEndRef = useTemplateRef<HTMLButtonElement>('skipToEndRef')
const sliderRef = useTemplateRef('sliderRef')
const headingId = `product-slider-heading-${useId().replace(/:/g, '')}`

const isSliderVisible = useElementVisibility(
  sliderRef as unknown as Ref<HTMLElement>,
  { once: true },
)

const { onProductIntersects, onProductSelect } = useProductSliderTracking(
  () => products,
  { productListId, itemListId, isVisible: isSliderVisible },
)

// Idle on mount; each slide change announces the visible range through the
// shared polite live region, debounced so rapid prev/next collapses to one.
const onSlideChange = (newSlide: number) => {
  announce(
    t('slider.a11y.visible_range', {
      start: newSlide + 1,
      total: products.length,
    }),
    { debounce: ANNOUNCE_DEBOUNCE_MS },
  )
}

// First focusable AFTER the region; no-op if none exists (focus stays put).
const skipToEnd = () => {
  getFirstFocusableAfter(regionRef.value)?.focus()
}

// Returns focus to the heading; the user re-enters the carousel via Tab.
const skipToStart = () => {
  headingRef.value?.focus()
}

// Shift+Tab from the first card's first interactive element skips the arrows.
const onCardShiftTab = (event: KeyboardEvent, index: number) => {
  if (
    index !== 0 ||
    event.target !== getFirstFocusable(event.currentTarget as HTMLElement)
  ) {
    return
  }
  event.preventDefault()
  skipToEndRef.value?.focus()
}

defineExpose({
  scrollProductIntoView: (index: number) =>
    sliderRef.value?.scrollImageIntoView(index),
})
</script>
