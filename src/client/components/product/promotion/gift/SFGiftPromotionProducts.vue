<template>
  <div ref="panelRef" class="rounded-xl border border-gray-200">
    <div
      class="mb-3 rounded-xl px-5 py-3"
      :style="{
        backgroundColor: giftPromotion.promotion.color.backgroundColor,
        color: giftPromotion.promotion.color.color,
        stroke: giftPromotion.promotion.color.color,
      }"
    >
      <div class="flex gap-1">
        <h2
          class="heading-section-3 font-bold! text-inherit"
          data-testid="headline"
        >
          {{ $t('buy_x_get_y_products.headline') }}
        </h2>
      </div>
      <p class="mt-1 text-sm">
        {{ $t('buy_x_get_y_products.description') }}
      </p>
    </div>
    <div class="flex flex-col divide-y divide-gray-200">
      <div v-for="(item, index) in giftPromotion.products" :key="item.id">
        <SFGiftPromotionProduct
          :eager-image-loading="index < 2"
          :product="item"
          :promotion="giftPromotion.promotion"
          :disabled="item.isSoldOut"
          :data-testid="`gift-item-${item.id}`"
          @select-item="onSelectItem(item, index)"
        />
      </div>
    </div>
    <SFProductPromotionSelectionModal
      v-if="selectedItem"
      v-model:visible="isModalOpen"
      :product="selectedItem"
      :promotion="giftPromotion.promotion"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useElementVisibility, whenever } from '@vueuse/core'
import type { DetailedProduct, GiftPromotion } from '@scayle/storefront/types'
import { useProductEvents } from '@client/composables/tracking/useProductEvents'
import SFProductPromotionSelectionModal from '../SFProductPromotionSelectionModal.vue'
import SFGiftPromotionProduct from './SFGiftPromotionProduct.vue'

const { giftPromotion } = defineProps<{
  giftPromotion: GiftPromotion
}>()

const selectedItem = ref<DetailedProduct | undefined>()
const isModalOpen = ref(false)

const { trackSelectItem, trackViewItemList, trackViewProductTile } =
  useProductEvents()
const panelRef = useTemplateRef<HTMLElement>('panelRef')
const isPanelVisible = useElementVisibility(panelRef, {
  once: true,
  threshold: 0.5,
})

const surface = () => ({
  product_list_type: 'gift_selection' as const,
  product_list_id: giftPromotion.promotion.id,
  total: giftPromotion.products.length,
})

// The reward list is its own `gift_selection` surface, identified by the
// promotion, on both the PDP and the basket page. The panel shows a handful
// of rewards stacked in one card, so it reports the SCAYLE Analytics tiles
// together with the list instead of observing each reward on its own. Each
// tile prices its first variant, so that variant goes on the tile payload.
whenever(isPanelVisible, () => {
  trackViewItemList(giftPromotion.products, surface())
  giftPromotion.products.forEach((item, index) => {
    trackViewProductTile(item, {
      ...surface(),
      position: index + 1,
      variant: item.variants?.at(0),
    })
  })
})

// The specification counts opening a product pop-up as a selection, so the
// plus button reports `select_item` and `select_product` although it never
// opens a detail page. It carries the same variant as the tile impression, so
// both report the price on screen.
const onSelectItem = (item: DetailedProduct, index: number) => {
  trackSelectItem(item, {
    index: index + 1,
    ...surface(),
    variant: item.variants?.at(0),
  })

  selectedItem.value = item
  isModalOpen.value = true
}
</script>
