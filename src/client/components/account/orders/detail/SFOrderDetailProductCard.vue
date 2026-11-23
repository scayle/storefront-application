<template>
  <SFLink
    :to="orderItem.product.link"
    raw
    class="flex min-h-28 flex-col gap-1"
    data-testid="order-detail-product-card"
  >
    <div class="flex grow gap-4">
      <div
        v-if="orderItem.product.image"
        class="w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200"
        aria-hidden="true"
        data-testid="order-detail-product-image"
      >
        <!-- Eager: the first thumbnail is the order detail page's LCP element. -->
        <SFProductImage
          :url="orderItem.product.image.url"
          preset="thumbnail"
          :alt="orderItem.product.name"
          :apply-padding="orderItem.product.image.applyPadding"
          image-loading="eager"
        />
      </div>
      <div class="flex flex-col gap-3 py-1">
        <SFOrderDetailProductDetails
          :name="orderItem.product.name"
          :brand="orderItem.product.brand"
          :size="orderItem.variant.size"
          :color="orderItem.product.color"
          :quantity="orderItem.quantity"
        />
        <SFBasketCardSubscriptionData
          :definition="orderItem.subscriptionDefinition"
          :subscription="orderItem.variant.subscription"
        />
      </div>
    </div>
    <div class="mt-auto flex justify-end">
      <SFProductPrice
        :price="orderItem.price"
        data-testid="order-product-card-prices"
        :inline="false"
      />
    </div>
  </SFLink>
</template>

<script setup lang="ts">
import SFLink from '@client/components/ui/links/SFLink.vue'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFProductPrice from '@client/components/product/SFProductPrice.vue'
import SFBasketCardSubscriptionData from '@client/components/basket/SFBasketCardSubscriptionData.vue'
import type { OrderItem } from '@scayle/storefront/types'
import SFOrderDetailProductDetails from './SFOrderDetailProductDetails.vue'

defineProps<{
  /** The order item to display. */
  orderItem: OrderItem
}>()
</script>
