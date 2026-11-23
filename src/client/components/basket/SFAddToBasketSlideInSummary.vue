<template>
  <div class="flex flex-col gap-5">
    <div class="flex gap-4" data-testid="add-to-basket-slide-in-card">
      <div
        class="flex w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-product-image-background"
      >
        <!--
          The slide-in mounts this summary only while it is open, after the page
          has loaded, so the image is always in view and competes with nothing.
        -->
        <SFProductImage
          v-if="productImage"
          :url="productImage.url"
          preset="tile"
          image-loading="eager"
          :alt="
            $t('product_image.alt', {
              productName: item.product.name,
              colors: item.product.color,
              brand: item.product.brand,
            })
          "
          :apply-padding="productImage.applyPadding"
          class="overflow-hidden rounded-lg"
        />
      </div>
      <div class="flex min-w-0 grow flex-col gap-2">
        <div class="min-w-0">
          <p class="truncate heading-section-3 leading-none">
            {{ item.product.brand }}
          </p>
          <p class="mt-1 truncate body-default">{{ item.product.name }}</p>
        </div>
        <SFBasketCardDetails :basket-item="item" is-quantity-shown />
        <SFProductPrice
          :price="item.totalPrice"
          size="lg"
          show-lowest-prior-price
          :inline="false"
          class="mt-auto"
          data-testid="add-to-basket-slide-in-card-prices"
        />
      </div>
    </div>
    <div class="flex gap-3 max-lg:flex-col">
      <SFButton
        variant="primary"
        size="lg"
        :to="routes.basket"
        class="w-full"
        data-testid="add-to-basket-slide-in-go-to-basket"
      >
        {{ $t('basket.go_to_basket') }}
      </SFButton>
      <SFButton
        variant="secondary"
        size="lg"
        :to="routes.checkout"
        class="w-full"
        data-testid="add-to-basket-slide-in-go-to-checkout"
      >
        {{ $t('basket.go_to_checkout') }}
      </SFButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BasketItem } from '@scayle/storefront/types'
import { routes } from '@shared/routes'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFProductPrice from '@client/components/product/SFProductPrice.vue'
import SFBasketCardDetails from './SFBasketCardDetails.vue'

const { item } = defineProps<{
  /** The basket line the confirmation is for. */
  item: BasketItem
}>()

// `images` arrives sorted with the primary image first.
const productImage = computed(() => item.product.images[0])
</script>
