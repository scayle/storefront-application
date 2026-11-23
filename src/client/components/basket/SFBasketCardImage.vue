<template>
  <div
    class="relative flex w-full grow items-center justify-center overflow-hidden rounded-lg bg-product-image-background"
    :class="isSmallSize ? 'max-w-28' : 'max-w-36'"
  >
    <SFLink
      v-if="basketItem.product.link"
      class="w-full"
      :to="basketItem.product.link"
      raw
      tabindex="-1"
    >
      <!-- Eager: the basket is server-rendered with its items in the initial viewport. -->
      <SFProductImage
        v-if="productImage"
        :url="productImage.url"
        :preset="'tile'"
        :alt="
          $t('product_image.alt', {
            productName: basketItem.product.name,
            colors: basketItem.product.color,
            brand: basketItem.product.brand,
          })
        "
        :apply-padding="productImage.applyPadding"
        image-loading="eager"
        class="overflow-hidden rounded-lg"
        :class="[{ 'opacity-60': basketItem.variant.isSoldOut }]"
      />
      <div
        v-if="
          basketItem.totalPrice.hasCampaignReduction ||
          basketItem.promotions.length
        "
        class="absolute bottom-2 left-1 flex max-w-[70%] flex-col gap-1"
      >
        <SFDealBadge
          v-if="campaign && basketItem.totalPrice.hasCampaignReduction"
          :text="campaign.badgeLabel || $t('campaign.deal')"
          :style="campaign.color"
        />
        <SFDealBadge
          v-for="promotion in basketItem.promotions"
          :key="promotion.id"
          :text="promotion.product?.badgeLabel || $t('promotion.deal')"
          :style="promotion.color"
        />
      </div>
    </SFLink>
    <div
      v-if="!hideWishlistToggle"
      class="absolute top-1 right-1 left-auto z-10 flex w-auto cursor-pointer transition"
    >
      <SFWishlistToggle
        class="bg-transparent!"
        :product="basketItem.product"
        product-list-type="basket"
        @click.prevent.stop
        @keydown.enter.stop
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { BasketItem, Campaign } from '@scayle/storefront/types'
import SFLink from '../ui/links/SFLink.vue'
import SFProductImage from '../product/SFProductImage.vue'
import SFWishlistToggle from '../product/SFWishlistToggle.vue'
import SFDealBadge from '../deal/SFDealBadge.vue'

const {
  basketItem,
  isSmallSize = false,
  hideWishlistToggle = false,
} = defineProps<{
  /** The basket item to display. */
  basketItem: BasketItem
  /** Whether the image should be displayed in a small size. */
  isSmallSize?: boolean
  /** When true, hides the wishlist control (e.g. header basket preview). */
  hideWishlistToggle?: boolean
  /** The campaign to display. */
  campaign?: Campaign | null
}>()

const productImage = computed(() => basketItem.product.images[0])
</script>
