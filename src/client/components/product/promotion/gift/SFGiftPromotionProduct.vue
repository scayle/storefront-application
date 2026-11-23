<template>
  <div class="flex w-full p-3" data-testid="product-promotion-gift-item">
    <div
      class="relative flex w-24 shrink-0 items-center rounded-lg bg-gray-300"
    >
      <SFProductImage
        v-if="thumbnailImage"
        :url="thumbnailImage.url"
        :preset="'thumbnail'"
        :alt="product.name"
        :image-loading="eagerImageLoading ? 'eager' : 'lazy'"
        :apply-padding="thumbnailImage.applyPadding"
        :class="{ 'opacity-20': disabled }"
      />
    </div>
    <div class="flex w-full flex-row items-center justify-between p-3">
      <div class="flex h-full flex-col justify-between">
        <div class="flex flex-col gap-1">
          <div
            class="text-md font-semibold"
            :class="disabled ? 'text-secondary' : 'text-primary'"
          >
            {{ product.brand }}
          </div>
          <h3
            data-testid="pdp-product-name-gift"
            class="heading-section-3 text-md font-normal!"
            :class="disabled ? 'text-secondary' : 'text-primary'"
          >
            {{ product.name }}
          </h3>
        </div>
        <div v-if="!product.isSoldOut" class="flex flex-row items-end gap-2">
          <SFGiftPromotionPrice :price="price" :promotion="promotion" />
        </div>
        <div v-else class="text-sm text-status-alert">
          {{ $t('global.sold_out') }}
        </div>
      </div>
      <div class="flex items-end justify-between">
        <SFButton
          size="lg"
          :variant="ButtonVariant.SECONDARY"
          data-testid="add-free-product-button"
          :disabled="disabled"
          :aria-label="
            $t('buy_x_get_y_products.a11y.add_item', { name: product.name })
          "
          @click="$emit('selectItem', product)"
        >
          <template #prepend-icon>
            <IconIncrementPlus />
          </template>
        </SFButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  DetailedProduct,
  BuyXGetYEffect,
  Promotion,
} from '@scayle/storefront/types'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconIncrementPlus from '@client/assets/icons/increment/plus.svg'
import { ButtonVariant } from '@client/utils/constants'
import SFGiftPromotionPrice from './SFGiftPromotionPrice.vue'

const {
  disabled = false,
  product,
  promotion,
  eagerImageLoading = false,
} = defineProps<{
  product: DetailedProduct
  promotion: Promotion<BuyXGetYEffect>
  eagerImageLoading?: boolean
  disabled?: boolean
}>()

defineEmits<{
  selectItem: [product: DetailedProduct]
}>()

const thumbnailImage = computed(() => product.images.at(0))

const price = computed(() => product.variants?.[0]?.price ?? product.price)
</script>
