<!-- eslint-disable vuejs-accessibility/no-static-element-interactions -- Hover and focus only track state that reveals the siblings picker. The links and buttons inside are the interactive elements. -->
<template>
  <article
    :id="`product-${product.id}`"
    ref="productCardRef"
    :data-testid="`article-${product.id}`"
    class="group/product-card @container/product-card relative flex h-full flex-col rounded-lg"
    @mouseenter="onPointerEnter"
    @mouseleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <div
      class="group relative isolate flex min-h-0 w-full flex-col overflow-hidden rounded-lg bg-product-image-background"
      :style="{
        aspectRatio: productCardImageAspectRatio,
        border: activeHighlight?.backgroundColor
          ? `2px solid ${activeHighlight.backgroundColor}`
          : undefined,
      }"
    >
      <div class="relative flex min-h-0 flex-1 items-center justify-center">
        <div
          class="absolute top-1 right-1 left-auto z-10 flex w-auto cursor-pointer transition"
        >
          <SFWishlistToggle
            :product="product"
            :product-list-type="productListType"
            :product-list-id="productListId"
            :index="productIndex + 1"
            class="bg-transparent!"
            @click.prevent.stop
            @keydown.enter.stop
          />
        </div>
        <div
          class="pointer-events-none absolute inset-x-0 top-0 z-10 mt-2 pl-1"
        >
          <SFProductBadges
            :product="{
              isNew: product.isNew,
              storefrontBadge: product.badge,
            }"
            class="flex flex-col"
          />
        </div>

        <template v-if="showImageSlider">
          <SFProductCardImageSlider
            :link="product.link"
            :is-product-hovered="isProductHovered"
            :images="orderedImages"
            :product-index="productIndex"
            :alt="product.name"
            :fetch-priority="fetchPriority"
            @select-product="emit('selectProduct')"
            @active-slide-change="onProductImageChange"
          />
        </template>
        <template v-else-if="cardImage">
          <!--
            `tabindex="-1"`: the image links to the same product as the title link below.
            `aria-hidden="true"`: removes this duplicate link from the accessibility tree.
          -->
          <SFLink
            :to="product.link"
            raw
            tabindex="-1"
            aria-hidden="true"
            class="flex size-full items-center justify-center"
            @click="emit('selectProduct')"
          >
            <SFProductImage
              :url="cardImage.url"
              :preset="'tile'"
              :alt="product.name"
              :image-loading="getProductImageLoading(productIndex)"
              :fetch-priority="fetchPriority"
              :apply-padding="cardImage.applyPadding"
              class="mx-auto size-full object-contain"
            />
          </SFLink>
        </template>
        <div
          v-else
          class="flex size-full items-center justify-center bg-gray-200 text-md text-secondary"
          aria-hidden="true"
        >
          —
        </div>
      </div>

      <div
        v-if="hasSiblings"
        data-testid="siblings-overlay"
        :class="[SIBLINGS_OVERLAY_BASE, siblingsClasses.overlay]"
        :aria-hidden="!showSiblings"
        :inert="!showSiblings"
      >
        <SFProductCardSiblingsPicker
          :siblings="product.siblings ?? []"
          :product-link="product.link"
          :product="product"
        />
      </div>

      <div
        class="pointer-events-none absolute inset-x-0 z-10 flex flex-col pl-1"
        :class="[
          isHighlightFooterVisible ? 'bottom-[22px]' : 'bottom-0',
          showDesktopSiblingsLayout && isHighlightFooterVisible
            ? 'lg:bottom-0'
            : '',
          siblingsClasses.lift,
        ]"
      >
        <SFBadges
          v-if="
            promotions.length > 0 ||
            campaign ||
            product.isLowStock ||
            isHighlightActive
          "
          :promotions="promotions"
          :campaign="campaign"
          :product="product"
          :is-highlight-active="isHighlightActive"
          :highlight-badge-style="highlightBadgeStyle"
          :highlight-badge-label="activeHighlight?.badgeLabel"
          :hide-default-highlight-badge="
            activeHighlight?.hideDefaultBadge ?? false
          "
          class="mb-1"
        />
        <SFProductCardInBasketBadge :product-id="product.id" />
      </div>

      <SFHighlightFooter
        v-if="isHighlightFooterVisible"
        :background-color="activeHighlight?.backgroundColor"
        :text-color="activeHighlight?.color"
        :countdown-end-date="activeHighlight?.countdownEndDate"
      />
    </div>

    <SFLink
      :to="product.link"
      raw
      class="relative flex min-w-0 flex-col"
      @click="$emit('selectProduct')"
    >
      <div class="relative min-h-14">
        <div class="mt-3 flex flex-col max-lg:mb-4 loaded:starting:opacity-0">
          <p
            data-testid="product-card-product-brand"
            class="truncate heading-section-2"
          >
            {{ product.brand }}
          </p>
          <h2
            data-testid="product-card-product-name"
            class="truncate text-lg/normal text-primary"
          >
            {{ product.name }}
          </h2>
        </div>
        <SFProductPrice
          v-if="product.price"
          :price="product.price"
          :show-tax-info="false"
          show-lowest-prior-price
          compact
          size="lg"
          class="left-2 mt-3 lg:left-0"
        />
      </div>
    </SFLink>
  </article>
</template>
<!-- eslint-enable vuejs-accessibility/no-static-element-interactions -->

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePage } from '@client/composables/usePage'
import { useProductCardHighlight } from '@client/composables/useProductCardHighlight'
import { useElementVisibility } from '@vueuse/core'
import type { ListingProduct } from '@scayle/storefront/types'
import type { AnalyticsProductListType } from '@scayle/storefront-api'
import SFLink from '@client/components/ui/links/SFLink.vue'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFProductBadges from '@client/components/product/SFProductBadges.vue'
import SFProductCardImageSlider from '@client/components/product/card/SFProductCardImageSlider.vue'
import SFProductCardSiblingsPicker from '@client/components/product/card/SFProductCardSiblingsPicker.vue'
import SFProductCardInBasketBadge from '@client/components/product/SFProductCardInBasketBadge.vue'
import SFProductPrice from '@client/components/product/SFProductPrice.vue'
import SFWishlistToggle from '@client/components/product/SFWishlistToggle.vue'
import {
  getProductImageLoading,
  PRODUCT_IMAGE_ASPECT_RATIO,
} from '@client/constants'
import { orderImagesByImageType } from '@client/utils/image'
import SFHighlightFooter from '../deal/SFHighlightFooter.vue'
import SFBadges from './SFBadges.vue'
import type { ProductCardHighlightOverride } from './productCardHighlight'

const {
  product,
  productListType,
  productListId,
  productIndex = 0,
  disableImageSlider = false,
  disableSiblingsPicker = false,
  highlightOverride,
  fetchPriority,
  imageType,
} = defineProps<{
  /** Product to render, with its images, name, price, badges, and product detail page link. */
  product: ListingProduct
  /**
   * SCAYLE Analytics surface of the list rendering the card (`category`,
   * `search_results`, `product_slider`, `wishlist`, ...), forwarded to the
   * wishlist toggle as the `add_to_wishlist` surface.
   */
  productListType: AnalyticsProductListType
  /** SCAYLE Analytics identifier within the surface, forwarded with the surface. */
  productListId?: string
  /**
   * Zero-based position of the card in its list. The first
   * `PRODUCT_IMAGE_EAGER_LOADING_COUNT` cards load their image eagerly.
   */
  productIndex?: number
  /**
   * Shows a single image instead of the image slider. Without it, the slider
   * mounts once the card is visible and the product has more than one image.
   */
  disableImageSlider?: boolean
  /** Hides the color-variant siblings picker overlay that appears on hover. */
  disableSiblingsPicker?: boolean
  /**
   * Direct highlight values (colored border, deal badge, optional countdown
   * footer). When omitted, the card derives the highlight from page promotions.
   */
  highlightOverride?: ProductCardHighlightOverride
  /**
   * Priority hint for the card image. Only the consumer that knows the card is
   * the page's LCP candidate should pass `'high'`, and only to one card.
   * `fetchpriority` is relative, so several `'high'` images cancel out.
   */
  fetchPriority?: 'high' | 'low' | 'auto'
  /**
   * Stable `imageType` value of the image view selected on the page. Images of
   * that type move to the front of the card and the slider; `undefined` keeps
   * the Panel order.
   */
  imageType?: string
}>()

const emit = defineEmits<{
  intersectProduct: [productId: number]
  selectProduct: []
}>()

const productCardImageAspectRatio = `${PRODUCT_IMAGE_ASPECT_RATIO[0]} / ${PRODUCT_IMAGE_ASPECT_RATIO[1]}`

const page = usePage()
const productCardRef = ref<HTMLElement | null>(null)
const hasBeenVisible = useElementVisibility(productCardRef, { once: true })

// A threshold of 0 also counts a card that only touches the viewport edge or
// sits at the clipped end of a slider, so the impression waits for half the card.
const hasBeenMostlyVisible = useElementVisibility(productCardRef, {
  once: true,
  threshold: 0.5,
})

watch(hasBeenMostlyVisible, (visible) => {
  if (!visible) {
    return
  }

  emit('intersectProduct', product.id)
})

// Pointer and focus are tracked apart, so leaving with one does not close the siblings picker
// while the other still holds. Otherwise moving the mouse off the card would make the picker
// `inert` under a focused sibling link, and a click on a non-focusable spot would close it
// under the pointer.
const isPointerInside = ref(false)
const isFocusInside = ref(false)
const isProductHovered = computed(
  () => isPointerInside.value || isFocusInside.value,
)
const showSiblings = ref(false)

const hasSiblings = computed(
  () =>
    !disableSiblingsPicker &&
    hasBeenVisible.value &&
    product.siblings.length > 0,
)

const showDesktopSiblingsLayout = computed(
  () => hasSiblings.value && showSiblings.value,
)

const onProductImageChange = () => {
  showSiblings.value = false
}

const revealSiblings = () => {
  if (hasSiblings.value) {
    showSiblings.value = true
  }
}

const onPointerEnter = () => {
  isPointerInside.value = true
  revealSiblings()
}

const onPointerLeave = () => {
  isPointerInside.value = false
  if (!isFocusInside.value) {
    showSiblings.value = false
  }
}

const onFocusIn = () => {
  isFocusInside.value = true
  revealSiblings()
}

// Focus moving between elements of the card (for example from the product link into the siblings
// picker) must keep the picker open. Hiding it would make it `inert` before the next element
// receives focus.
const onFocusOut = (event: FocusEvent) => {
  if (
    event.relatedTarget instanceof Node &&
    productCardRef.value?.contains(event.relatedTarget)
  ) {
    return
  }
  isFocusInside.value = false
  if (!isPointerInside.value) {
    showSiblings.value = false
  }
}

const showImageSlider = computed(
  () =>
    !disableImageSlider && hasBeenVisible.value && product.images.length > 1,
)

const orderedImages = computed(() =>
  orderImagesByImageType(product.images, imageType),
)

// Still image shown until the slider takes over: the first image of the
// selected view, or the one the shop put first in the Panel.
const cardImage = computed(() => orderedImages.value[0])

const SIBLINGS_TRANSITION =
  'transition-all transition-discrete duration-200 ease-in-out'

const SIBLINGS_OVERLAY_BASE = `absolute inset-x-0 bottom-0 z-20 max-lg:hidden ${SIBLINGS_TRANSITION}`

const siblingsClasses = computed(() => {
  const lgTransition =
    'lg:transition-all lg:transition-discrete lg:duration-200 lg:ease-in-out'

  let lift = ''
  if (showDesktopSiblingsLayout.value) {
    lift = `${lgTransition} lg:-translate-y-18`
  } else if (hasSiblings.value) {
    lift = lgTransition
  }

  return {
    overlay: showSiblings.value
      ? 'translate-y-0 pointer-events-auto'
      : 'translate-y-full pointer-events-none',
    lift,
  }
})

const {
  promotions,
  activeHighlight,
  isHighlightActive,
  isHighlightFooterVisible,
  highlightBadgeStyle,
} = useProductCardHighlight(
  () => product,
  () => highlightOverride,
)

const campaign = computed(() => {
  return page.props.campaign
})

// Lets consumers move focus to the card's product link programmatically (e.g.
// the wishlist page restoring focus to a neighbor after a removal). The first
// anchor in the card is a product link; querying it is more robust than
// SFLink's `$el`, which is a comment placeholder when it wraps Inertia's <Link>.
defineExpose({
  focus: () => productCardRef.value?.querySelector<HTMLElement>('a')?.focus(),
})
</script>
