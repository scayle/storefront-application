<template>
  <SFLink
    :to="item.product.link"
    class="flex flex-col gap-1"
    data-testid="success-product-card"
    raw
  >
    <div class="flex gap-4">
      <div
        v-if="item.product.image"
        class="w-20 shrink-0"
        aria-hidden="true"
        data-testid="success-product-image-wrapper"
      >
        <!--
          Eager: on desktop the summary sits beside the greeting in the initial
          viewport, so the first thumbnail is an LCP candidate.
        -->
        <SFProductImage
          :url="item.product.image.url"
          :preset="'thumbnail'"
          :alt="item.product.name"
          image-loading="eager"
          :apply-padding="item.product.image.applyPadding"
          class="overflow-hidden rounded-lg border border-gray-200"
          data-testid="success-product-image"
        />
      </div>
      <div class="flex flex-col gap-3 py-1">
        <div class="flex flex-col">
          <span
            class="text-md font-semibold text-secondary"
            data-testid="success-product-brand"
            >{{ item.product.brand }}</span
          >
          <span
            class="mb-2 body-default-secondary"
            data-testid="success-product-name"
            >{{ item.product.name }}</span
          >
          <ul class="flex flex-col gap-1">
            <li>
              <SFLabelValue
                :label="$t('product_attribute.color')"
                :value="item.product.color"
                data-testid="success-product-color"
              />
            </li>
            <li>
              <SFLabelValue
                :label="$t('product_attribute.size')"
                :value="item.variant.size"
                data-testid="success-product-size"
              />
            </li>
            <li>
              <SFLabelValue
                :label="$t('global.quantity')"
                :value="String(item.quantity)"
                data-testid="success-product-quantity"
              />
            </li>
          </ul>
        </div>
        <SFBasketCardSubscriptionData
          :definition="item.subscriptionDefinition"
          :subscription="item.variant.subscription"
        />
      </div>
    </div>
    <SFProductPrice
      :price="item.price"
      :inline="false"
      class="ml-auto"
      data-testid="success-product-price"
    />
  </SFLink>
</template>

<script setup lang="ts">
import type { OrderItem } from '@scayle/storefront/types'
import SFBasketCardSubscriptionData from '@client/components/basket/SFBasketCardSubscriptionData.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFProductPrice from '@client/components/product/SFProductPrice.vue'
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'

defineProps<{
  item: OrderItem
}>()
</script>
