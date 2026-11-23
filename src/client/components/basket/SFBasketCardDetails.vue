<template>
  <div class="space-y-2 text-md leading-none lg:text-sm">
    <div class="mt-1 flex space-x-1">
      <SFLabelValue
        :label="$t('product_attribute.color')"
        :value="basketItem.product.color"
      />
    </div>
    <div class="flex space-x-1">
      <SFBasketVariantSelector
        v-if="isSizeEditable"
        ref="variantSelector"
        :item="basketItem"
        :loading="loading"
        @change="$emit('changeVariant', $event)"
      />
      <SFLabelValue
        v-else
        :label="$t('product_attribute.size')"
        :value="basketItem.variant.label"
      />
    </div>
    <div v-if="isQuantityShown" class="mt-1 flex space-x-1">
      <SFLabelValue
        :label="$t('global.quantity')"
        :value="basketItem.quantity.toString()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { BasketItem } from '@scayle/storefront/types'
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'
import SFBasketVariantSelector from '@client/components/basket/SFBasketVariantSelector.vue'

const {
  basketItem,
  isQuantityShown = false,
  sizeEditable = false,
  loading = false,
} = defineProps<{
  basketItem: BasketItem
  isQuantityShown?: boolean
  /** Blocks the size selector while a change to this line is in flight. */
  loading?: boolean
  /**
   * Replaces the plain size label with a selector the customer can change the
   * line's size from. Off by default: the mini-basket popover renders this
   * component too, and size editing belongs to the basket page.
   */
  sizeEditable?: boolean
}>()

defineEmits<{
  /** Relays the selector's size change request, carrying the new variant id. */
  changeVariant: [variantId: number]
}>()

/**
 * Subscription lines keep the plain label. Their stored definition was verified
 * against the variant they were added with, so switching size would leave the
 * line claiming a subscription the new variant may not offer.
 *
 * Availability is deliberately not a condition: an unavailable line is the case
 * where a customer most wants another size, and the change is the shortest way
 * out of a line they cannot order.
 */
const isSizeEditable = computed(
  () => sizeEditable && !basketItem.customData.subscriptionDefinition,
)

const variantSelector =
  useTemplateRef<InstanceType<typeof SFBasketVariantSelector>>(
    'variantSelector',
  )

defineExpose({
  /**
   * Moves keyboard focus to the size selector, when this line renders one.
   * Relayed from the card so the basket page can put focus back on the picker
   * after a size change replaced the line.
   *
   * @returns Whether the selector took focus. A line that renders no selector
   * (a subscription, or one the page marked not size-editable) reports `false`
   * so the caller can fall back rather than silently drop focus.
   */
  focusVariantSelector: () => {
    if (!variantSelector.value) {
      return false
    }
    variantSelector.value.focus()
    return true
  },
})
</script>
