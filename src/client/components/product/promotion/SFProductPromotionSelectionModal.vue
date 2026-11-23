<template>
  <SFModal
    v-model:visible="isModalOpen"
    size="lg"
    :labelled-by="titleId"
    class="p-0 max-lg:mt-auto max-lg:max-h-full"
    data-testid="promo-product-selection-modal"
  >
    <!--
      Both hero images keep the lazy default. The modal opens on a click after
      the page has loaded, and only one of the two breakpoint variants has a
      box, so lazy loading skips the hidden duplicate instead of downloading
      the detail image twice.
    -->
    <div class="flex">
      <div class="hidden p-3 lg:block lg:w-1/2 lg:shrink-0">
        <div
          v-if="heroImage"
          class="relative flex min-h-96 w-full items-center justify-center overflow-hidden rounded-xl bg-product-image-background"
        >
          <SFProductImage
            :url="heroImage.url"
            :preset="'detail'"
            :alt="product.name"
            :apply-padding="heroImage.applyPadding"
            class="size-full"
          />
          <SFWishlistToggle
            class="absolute top-5 right-5 bg-transparent!"
            :product="product"
            product-list-type="gift_selection"
            :product-list-id="promotion.id"
          />
        </div>
      </div>
      <div class="flex w-full flex-col justify-center p-6 lg:p-8 lg:py-14">
        <div class="mb-4 lg:mb-auto">
          <span class="font-semibold text-primary">
            {{ product.brand }}
          </span>
          <h3
            :id="titleId"
            data-testid="pdp-product-name-gift-promotion-modal"
            class="mb-4 heading-section-3 font-normal! text-secondary"
          >
            {{ product.name }}
          </h3>
          <SFGiftPromotionPrice :price="product.price" :promotion="promotion" />
        </div>
        <div
          v-if="heroImage"
          class="relative mb-8 flex aspect-product w-full items-center justify-center overflow-hidden rounded-xl bg-product-image-background lg:hidden"
        >
          <SFProductImage
            :url="heroImage.url"
            :preset="'detail'"
            :alt="product.name"
            :apply-padding="heroImage.applyPadding"
            class="size-full"
          />
          <SFWishlistToggle
            class="absolute top-5 right-5 bg-transparent!"
            :product="product"
            product-list-type="gift_selection"
            :product-list-id="promotion.id"
          />
        </div>
        <div class="flex flex-col gap-4">
          <div class="mt-7 heading-section-2 leading-[14px]">
            {{ $t('product_attribute.size') }}:
          </div>
          <SFVariantPicker
            ref="variantPickerRef"
            v-model:visible="isVariantListVisible"
            v-model:active-variant="activeVariant"
            :variants="product.variants"
            strike-through-price
            :reduction-label="reductionLabel"
            class="lg:mb-4"
          />
          <div class="flex justify-between gap-2">
            <SFButton
              type="button"
              data-testid="add-item-to-basket-button"
              variant="accent"
              :disabled="product.isSoldOut"
              :title="
                product.isSoldOut
                  ? $t('global.sold_out')
                  : $t('add_to_basket.add_to_basket')
              "
              :loading="isAdding"
              class="w-full flex-4 justify-between px-4!"
              @click="addToBasket"
            >
              {{
                product.isSoldOut
                  ? $t('global.sold_out')
                  : $t('add_to_basket.add_to_basket')
              }}
              <template #append-icon>
                <IconCommerceBasket class="size-6 fill-white" />
              </template>
            </SFButton>
            <SFButton
              variant="secondary"
              :to="product.link"
              class="flex-1 border-gray-400!"
              @click="close"
            >
              {{ $t('product_promotion_selection_modal.details') }}
            </SFButton>
          </div>
        </div>
      </div>
    </div>
  </SFModal>
</template>

<script setup lang="ts">
import { ref, computed, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  DetailedProduct,
  ProductVariant,
  BuyXGetYEffect,
  Promotion,
} from '@scayle/storefront/types'
import { getPromotionReductionLabel } from '@shared/utils/promotion'
import SFModal from '@client/components/ui/core/SFModal.vue'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFVariantPicker from '@client/components/product/SFVariantPicker.vue'
import SFWishlistToggle from '@client/components/product/SFWishlistToggle.vue'
import IconCommerceBasket from '@client/assets/icons/commerce/basket.svg'
import { useBasket } from '@client/composables/useBasket'
import { useBasketEvents } from '@client/composables/tracking/useBasketEvents'
import SFGiftPromotionPrice from './gift/SFGiftPromotionPrice.vue'

const { product, promotion } = defineProps<{
  product: DetailedProduct
  promotion: Promotion<BuyXGetYEffect>
}>()

const isModalOpen = defineModel<boolean>('visible', { default: false })

const { t } = useI18n()

const reductionLabel = computed(() => getPromotionReductionLabel(promotion, t))

const titleId = useId()

const heroImage = computed(() => product.images.at(0))

// Modal can be triggered from PDP or Basket — refresh deferred props from both pages.
// `giftPromotion` (singular) is the PDP prop; `giftPromotions` belongs to Basket.
const { addItem } = useBasket(['giftPromotion', 'giftPromotions'])
const { trackAddToBasket } = useBasketEvents()
const variantPickerRef = ref<InstanceType<typeof SFVariantPicker> | null>(null)
const isVariantListVisible = ref(false)
const isVariantAvailable = (variant: ProductVariant) => variant.stock > 0
const activeVariant = ref<ProductVariant | undefined>(
  product.variants?.find(isVariantAvailable),
)
const isAdding = ref(false)

const hasOneVariantOnly = computed(() => (product.variants?.length ?? 0) <= 1)

watch(
  () => product.id,
  () => {
    activeVariant.value = product.variants?.find(isVariantAvailable)
  },
)

const addToBasket = async () => {
  if (!activeVariant.value) {
    isVariantListVisible.value = true
    variantPickerRef.value?.$el?.scrollIntoView?.({ block: 'center' })
    return
  }
  const variant = activeVariant.value
  isAdding.value = true
  try {
    const added = await addItem({
      productName: product.name,
      variantId: variant.id,
      quantity: 1,
    })
    if (added) {
      trackAddToBasket(variant, product, added, {
        product_list_type: 'gift_selection',
        product_list_id: promotion.id,
      })
    }
    isModalOpen.value = false
  } finally {
    isAdding.value = false
  }
}

const close = () => {
  if (!hasOneVariantOnly.value) {
    activeVariant.value = undefined
  }
  isModalOpen.value = false
}
</script>
