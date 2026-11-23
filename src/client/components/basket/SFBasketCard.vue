<template>
  <li
    ref="basketCard"
    class="group -mt-px w-full list-none space-y-2 border border-gray-300 p-3 focus-within:z-10 max-lg:border-x-0 max-lg:px-0 max-lg:last:border-b-0 lg:first:rounded-t-xl lg:last:rounded-b-xl"
    data-testid="basket-card"
    v-bind="$attrs"
  >
    <SFBasketCardSoldOutTitle
      v-if="item.variant.isSoldOut"
      class="hidden group-first:flex"
    />
    <SFBasketCardOutOfTimeFrameTitle
      v-else-if="item.product.sellableTimeframe.state !== 'active'"
      :timeframe="item.product.sellableTimeframe"
      class="hidden group-first:flex"
    />
    <div class="flex w-full">
      <SFBasketCardImage
        :basket-item="item"
        :is-sold-out="item.variant.isSoldOut"
        :campaign="campaign"
      />
      <div class="flex w-full flex-col overflow-hidden">
        <div class="ml-5 flex justify-between gap-1 max-lg:ml-3">
          <div data-testid="basket-product-brand" class="overflow-hidden">
            <div
              class="mt-3.5 truncate px-1 heading-section-3 leading-none max-lg:mt-1"
              data-testid="main-label"
            >
              {{ item.product.brand }}
            </div>
            <SFLink
              v-if="item.product.link"
              :to="item.product.link"
              raw
              class="mt-1 block truncate rounded-sm p-1 body-default duration-300 hover:bg-gray-200 focus-visible:focus-style-inset"
              data-testid="sub-label"
            >
              {{ item.product.name }}
            </SFLink>
          </div>
          <div class="flex gap-x-2 max-lg:items-start lg:items-center">
            <SFQuantityInput
              v-if="!item.variant.isSoldOut"
              :quantity="item.quantity"
              :max-quantity="getMaxQuantity(item.variant)"
              :loading="loading"
              class="max-lg:hidden"
              @update:quantity="$emit('updateQuantity', $event as number)"
            />
            <SFButton
              ref="removeButton"
              variant="raw"
              :aria-label="
                $t('basket_card.remove_item', { name: item.product.name })
              "
              :loading="loading"
              class="flex size-11 items-center justify-center rounded-lg hover:bg-gray-300 focus-visible:focus-style-inset max-lg:bg-gray-300 lg:size-8"
              data-testid="basket-remove-item-button"
              @click="$emit('delete')"
            >
              <template #append-icon>
                <IconCommerceRemove class="size-4! shrink-0" />
              </template>
            </SFButton>
          </div>
        </div>
        <div class="flex grow flex-col lg:justify-between">
          <SFBasketCardDetails
            ref="cardDetails"
            :basket-item="item"
            size-editable
            :loading="loading"
            class="mt-7 pl-6 max-lg:pl-4"
            @change-variant="$emit('changeVariant', $event)"
          />
          <SFBasketCardSubscriptionData
            class="mt-2 pl-4 lg:hidden"
            :definition="item.customData.subscriptionDefinition"
            :subscription="item.variant.subscription"
          />
          <div class="flex w-full items-end justify-between gap-4">
            <SFBasketCardSubscriptionData
              class="min-w-0 pl-6 max-lg:hidden lg:mt-3"
              :definition="item.customData.subscriptionDefinition"
              :subscription="item.variant.subscription"
            />
            <SFProductPrice
              :price="item.totalPrice"
              size="lg"
              show-lowest-prior-price
              class="ml-auto shrink-0 self-end max-lg:hidden"
              data-testid="basket-card-prices"
              :inline="false"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-start justify-between lg:hidden">
      <SFQuantityInput
        v-if="!item.variant.isSoldOut"
        :quantity="item.quantity"
        :max-quantity="getMaxQuantity(item.variant)"
        :loading="loading"
        class="w-36 justify-between"
        @update:quantity="$emit('updateQuantity', $event as number)"
      />
      <SFProductPrice
        :price="item.totalPrice"
        size="lg"
        show-lowest-prior-price
        class="ml-auto self-end lg:hidden"
        data-testid="basket-card-prices"
        :inline="false"
      />
    </div>
    <SFLowStockBanner
      size="small"
      :message="lowStockMessage"
      class="mt-2 ml-auto w-fit"
    />
  </li>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BasketItem, Campaign } from '@scayle/storefront/types'
import { getMaxQuantity } from '@client/utils/product'
import IconCommerceRemove from '@assets/icons/commerce/remove.svg'
import SFLink from '../ui/links/SFLink.vue'
import SFQuantityInput from '../product/SFQuantityInput.vue'
import SFButton from '../ui/core/SFButton.vue'
import SFProductPrice from '../product/SFProductPrice.vue'
import SFLowStockBanner from '../product/SFLowStockBanner.vue'
import SFBasketCardDetails from './SFBasketCardDetails.vue'
import SFBasketCardImage from './SFBasketCardImage.vue'
import SFBasketCardSoldOutTitle from './SFBasketCardSoldOutTitle.vue'
import SFBasketCardOutOfTimeFrameTitle from './SFBasketCardOutOfTimeFrameTitle.vue'
import SFBasketCardSubscriptionData from './SFBasketCardSubscriptionData.vue'

defineOptions({ inheritAttrs: false })

defineEmits<{
  delete: []
  updateQuantity: [newQuantity: number]
  /** The customer picked a different size for this line. */
  changeVariant: [variantId: number]
}>()

const { item, loading = false } = defineProps<{
  /** The basket item to display. */
  item: BasketItem
  /** The campaign to display. */
  campaign?: Campaign | null
  /** Loading state of the card. */
  loading?: boolean
}>()

const removeButton = useTemplateRef<{ $el: HTMLElement }>('removeButton')
const cardDetails =
  useTemplateRef<InstanceType<typeof SFBasketCardDetails>>('cardDetails')

defineExpose({
  /**
   * Moves keyboard focus to this card's remove button. Used by the basket page
   * to restore focus to a neighboring card after an adjacent line is removed.
   */
  focus: () => removeButton.value?.$el?.focus(),
  /**
   * Moves keyboard focus to this card's size selector. Used by the basket page
   * on the replacement line after a size change, which unmounts the card the
   * customer picked the size on.
   *
   * @returns Whether the selector took focus, so the page can fall back to the
   * remove button on a line that renders no selector.
   */
  focusVariantSelector: () =>
    cardDetails.value?.focusVariantSelector() ?? false,
})

/**
 * Scarcity banner visibility. The flag is pre-computed server-side in the
 * basket mapper using `availableQuantity` (which accounts for promotion caps
 * and reserved stock), so the client only needs to exclude sold-out items,
 * where the existing sold-out headline already communicates the state.
 */
const { t } = useI18n()

const showLowStock = computed(() => !item.variant.isSoldOut && item.isLowStock)

/** Resolved scarcity copy, or `undefined` when the banner should stay hidden. */
const lowStockMessage = computed(() =>
  showLowStock.value
    ? t('low_stock.x_left', { count: item.availableQuantity })
    : undefined,
)
</script>
