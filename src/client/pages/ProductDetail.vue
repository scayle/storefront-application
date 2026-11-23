<template>
  <PageMetaHead :meta="meta" :hreflangs="hreflangs" :json-ld="jsonLd" />
  <div class="container lg:pt-4">
    <div
      class="flex flex-col items-start gap-8 max-sm:space-y-5 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-8 lg:overflow-visible"
    >
      <!--
        Both columns are sticky from lg up (see `useStickyColumn`): whichever is
        shorter pins while the taller one scrolls, without either side having to
        know which that is. `items-start` on the row above is what gives the
        shorter column room to travel, and the pin releases at the row's bottom
        edge — right where the sliders below begin.

        Sticky sits on the grid item so the stick range spans the full row, and
        `useStickyColumn` measures that same element. The inner wrapper only
        adds room for the 6px focus ring; no overflow or max-height on either
        layer.

        The gallery column opts out of `items-start` with `self-stretch`: shrunk
        to its content, which the gallery sizes only in percentages and aspect
        ratios, Safari resolves it to a 0px wide column.
      -->
      <div
        ref="galleryColumn"
        :style="galleryColumnStyle"
        class="-mx-4 min-w-0 self-stretch sm:mx-0 sm:w-full lg:sticky lg:self-start lg:overflow-visible"
      >
        <div class="flex items-start lg:-m-1.5 lg:p-1.5">
          <SFProductGallery :product="product" />
        </div>
      </div>
      <div
        ref="infoColumn"
        :style="infoColumnStyle"
        class="min-w-0 max-lg:w-full lg:sticky lg:self-start lg:overflow-visible"
      >
        <div class="flex flex-col gap-5 lg:-m-1.5 lg:p-1.5">
          <SFBreadcrumb
            v-if="product.breadcrumbs"
            :items="product.breadcrumbs"
            class="hidden lg:block"
          />
          <!--
            One <h1> so the page's main heading identifies the specific product
            (brand + name). The inner spans keep the visual hierarchy — brand
            prominent, name below — without splitting it across the heading
            outline.
          -->
          <h1 class="lg:mb-2">
            <span
              class="block truncate heading-section-1"
              data-testid="pdp-product-brand"
            >
              {{ product.brand }}
            </span>
            <span
              class="block truncate body-xlarge"
              data-testid="pdp-product-name"
            >
              {{ product.name }}
            </span>
          </h1>
          <SFProductPrice
            :price="price"
            :promotions="promotions"
            size="xl"
            show-tax-info
            show-lowest-prior-price
          />
          <SFPromotionConfirmation v-if="hasAppliedPromotion" />
          <SFProductDealBanners
            :promotions="promotions"
            :campaign="page.props.campaign ?? null"
            :price="price"
          />
          <SFSiblingSelection :product="product" />
          <SFProductActions
            v-model:quantity="quantity"
            :product="product"
            :active-variant="activeVariant"
            :access-token="accessToken"
            @update:active-variant="syncVariantToUrl"
          />
          <ClientOnly v-if="country.publicFields?.subscriptionEnabled">
            <SFProductSubscription
              v-if="isSubscriptionEligible"
              :product="product"
              :variant="activeVariant"
              :quantity="quantity"
              :subscription-price="
                activeVariant
                  ? subscriptionPrices?.[activeVariant.id]
                  : undefined
              "
              @add-item-to-basket="addSubscriptionToBasket"
            />
          </ClientOnly>
          <Deferred :data="['giftPromotion']">
            <template #default>
              <SFGiftPromotionProducts
                v-if="giftPromotion?.products?.length && isGiftUnlocked"
                :gift-promotion="giftPromotion"
              />
            </template>
            <template #fallback />
          </Deferred>
          <SFProductDetails :product="product" class="mt-7" />
        </div>
      </div>
    </div>
    <!-- Uses Inertia's Deferred component to load recommendations asynchronously after the initial page render, showing a skeleton placeholder until the data arrives. -->
    <Deferred :data="['similarProducts', 'trendingProducts']">
      <template #fallback>
        <SFProductSliderSkeleton />
      </template>

      <template #default>
        <div class="mt-12 flex flex-col gap-12">
          <SFProductSlider
            v-if="similarProducts?.length"
            :products="similarProducts"
            :title="$t('product_detail_page.similar_products')"
            :product-list-id="ProductSliderIds.SimilarProducts"
            data-testid="similar-products-slider"
          />
          <SFProductSlider
            v-if="trendingProducts?.length"
            :products="trendingProducts"
            :title="$t('product_detail_page.trending_products')"
            :product-list-id="ProductSliderIds.Trending"
            data-testid="trending-products-slider"
          />
        </div>
      </template>
    </Deferred>
    <SFRecentlyViewedProductSlider
      class="mt-12"
      data-testid="recently-viewed-products-slider"
    />
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-detail-page
import type {
  ListingProduct,
  VariantPrice,
  Hreflang,
  DetailedProduct,
  ProductVariant,
  GiftPromotion,
} from '@scayle/storefront/types'
import type { AddToBasketInput } from '@client/composables/useBasket'
import type { ProductDetailPageJsonLd, SEOMeta } from '@shared/types/SEO'
import { ProductSliderIds } from '@shared/types/Tracking'
import SFProductGallery from '@client/components/product/detail/productGallery/SFProductGallery.vue'
import SFBreadcrumb from '@client/components/ui/breadcrumb/SFBreadcrumb.vue'
import SFProductActions from '@client/components/product/detail/SFProductActions.vue'
import SFProductSubscription from '@client/components/product/detail/SFProductSubscription.vue'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import { Deferred, router } from '@inertiajs/vue3'
import { usePage } from '@client/composables/usePage'
import SFProductDetails from '@client/components/product/SFProductDetails.vue'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import SFProductSliderSkeleton from '@client/components/product/slider/SFProductSkeletonSlider.vue'
import SFRecentlyViewedProductSlider from '@client/components/product/slider/SFRecentlyViewedProductSlider.vue'
import { computed, onMounted, ref, watch } from 'vue'
import SFProductPrice from '@client/components/product/SFProductPrice.vue'
import SFSiblingSelection from '@client/components/product/detail/SFSiblingSelection.vue'
import { useRoute } from '@client/composables/useRoute'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import SFPromotionConfirmation from '@client/components/deal/SFPromotionConfirmation.vue'
import { useProductPromotions } from '@client/composables/useProductPromotions'
import { useBasket } from '@client/composables/useBasket'
import { useBasketEvents } from '@client/composables/tracking/useBasketEvents'
import SFProductDealBanners from '@client/components/product/promotion/SFProductDealBanners.vue'
import SFGiftPromotionProducts from '@client/components/product/promotion/gift/SFGiftPromotionProducts.vue'
import { useRecentlyViewedProducts } from '@client/composables/useRecentlyViewedProducts'
import { useProductEvents } from '@client/composables/tracking/useProductEvents'
import { useStickyColumn } from '@client/composables/useStickyColumn'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'

interface Props {
  product: DetailedProduct
  meta: SEOMeta
  hreflangs?: Hreflang[]
  /** Server-only: present on the server-rendered page, absent after a client-side navigation. */
  jsonLd?: ProductDetailPageJsonLd
  similarProducts?: ListingProduct[]
  trendingProducts?: ListingProduct[]
  giftPromotion?: GiftPromotion | null
  // Deferred prop (see product-detail.ts): undefined until the customer-data
  // group is auto-fetched after mount.
  accessToken?: string
  subscriptionPrices?: Record<number, VariantPrice>
}

const {
  product,
  giftPromotion,
  accessToken,
  subscriptionPrices,
  trendingProducts,
} = defineProps<Props>()

const page = usePage()

// The gallery grows with the image count and the info column with variants,
// subscription, gift promotion and expanded accordions, so either can end up
// the taller one. Each column pins against the other; the taller one's own
// sticky positioning is inert.
const galleryColumn = ref<HTMLElement>()
const infoColumn = ref<HTMLElement>()
const galleryColumnStyle = useStickyColumn(galleryColumn)
const infoColumnStyle = useStickyColumn(infoColumn)

const { country } = useStorefrontConfig()

const { query, path } = useRoute()

const variantIdQueryParam = computed(() => {
  const variantId = query.value.get('variantId')
  return variantId ? Number(variantId) : undefined
})

const quantity = ref(1)

const activeVariant = computed<ProductVariant | undefined>(() => {
  const variants = product.variants

  if (!variants?.length) {
    return undefined
  }

  if (variants.length === 1) {
    return variants[0]
  }

  const targetId = variantIdQueryParam.value
  return targetId ? variants.find(({ id }) => id === targetId) : undefined
})

// A variant carries `subscription` only when it can be subscribed to, so the
// page gates its subscription block on any variant having one.
const isSubscriptionEligible = computed(() =>
  product.variants.some((variant) => variant.subscription),
)

const { promotions, hasAppliedPromotion } = useProductPromotions(() => product)

const { isGiftPromotionApplicable, addItem } = useBasket()

const { trackAddToBasket } = useBasketEvents()

/** Adds a prepared subscription payload to the basket and tracks the event. */
const addSubscriptionToBasket = async (item: {
  productName: string
  variantId: number
  quantity: number
  customData: AddToBasketInput['customData']
}) => {
  const added = await addItem(item)
  if (added && activeVariant.value) {
    trackAddToBasket(activeVariant.value, product, added)
  }
}

/** True when the basket conditions for the gift promotion are met. */
const isGiftUnlocked = computed(() =>
  giftPromotion ? isGiftPromotionApplicable(giftPromotion.promotion.id) : false,
)

const price = computed(() => {
  return activeVariant.value?.price ?? product.price
})

const syncVariantToUrl = (newVariant: ProductVariant | undefined) => {
  // Prevent redundant router replaces if the variant hasn't actually changed
  if (!newVariant || newVariant.id === variantIdQueryParam.value) {
    return
  }

  // Build the query string for the new variant
  const nextQuery = new URLSearchParams(query.value)
  nextQuery.set('variantId', String(newVariant.id))

  const queryString = nextQuery.toString()

  // The URL is the single source of truth for the selected variant. We build
  // the full URL string (Inertia requires it) and copy the existing params to
  // preserve unrelated ones (e.g. UTM tags).
  router.replace({
    url: `${path.value}?${queryString}`,
    preserveScroll: true,
    preserveState: true,
  })
}

watch(activeVariant, () => {
  quantity.value = 1
})

const { addProductId } = useRecentlyViewedProducts()
const { trackViewItem } = useProductEvents()
onMounted(() => {
  trackViewItem(product, activeVariant.value)

  // SFRecentlyViewedProductSlider's child onMounted hook fires before this
  // parent hook, so it has already loaded the previously persisted product
  // ids before we append the current product. This keeps the current product
  // out of the slider's initial render while still recording it for the next
  // page view.
  addProductId(product.id)
})
</script>
