<template>
  <SFLabelValue
    :label="$t('product_attribute.size')"
    :tag="TextTag.DIV"
    class="flex min-w-0 items-center gap-1"
  >
    <!--
      The empty ::before box reserves 112px: it widens the span to at least that
      much, like a min-w-28 would, but unlike a min-width it gives way when the
      row has less room left, so the picker never leaves the card at 320px.
    -->
    <span
      class="inline-block w-max max-w-full align-middle before:block before:h-0 before:w-28 before:max-w-full"
    >
      <SFVariantPicker
        ref="variantPicker"
        :variants="item.variants"
        :active-variant="activeVariant"
        :size="DropdownSize.SM"
        :aria-label="
          $t('basket.size_selector.a11y.select_size', {
            name: item.product.name,
          })
        "
        :disabled="loading"
        data-testid="basket-variant-selector"
        @update:active-variant="onVariantSelected"
      />
    </span>
  </SFLabelValue>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { BasketItem, ProductVariant } from '@scayle/storefront/types'
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'
import SFVariantPicker from '@client/components/product/SFVariantPicker.vue'
import { DropdownSize, TextTag } from '@client/utils/constants'
import { useMounted } from '@vueuse/core'

const { item, loading = false } = defineProps<{
  /** The basket line whose size the customer can change. */
  item: BasketItem
  /**
   * Blocks the picker while the change it requested is still in flight, so a
   * second size cannot be picked against a line the basket is about to replace.
   */
  loading?: boolean
}>()

const emit = defineEmits<{
  /**
   * Requests a size change, carrying the variant to switch the line to. The
   * basket page performs the change: it owns the line's loading state and the
   * props that have to be reloaded with the basket.
   */
  change: [variantId: number]
}>()

/**
 * The picker's selected entry, matched by id rather than identity: the line's
 * variant and its entry in `variants` are separate objects in the Inertia
 * payload even when they describe the same variant.
 */
const activeVariant = computed(() =>
  item.variants.find((variant) => variant.id === item.variant.id),
)

// A variant deactivated after the line was added drops out of the product's
// variant list while staying on the line, so `activeVariant` above resolves to
// nothing. With exactly one variant left, `SFVariantPicker` preselects it
// during setup, and the id comparison below would read that write as a customer
// picking a new size. Only a selection made after mount is a real pick.
const isMounted = useMounted()

// `variant` is optional because the picker's `activeVariant` model is: its type
// admits an empty selection even though nothing in the picker clears one.
const onVariantSelected = (variant: ProductVariant | undefined) => {
  // A customer can reselect the size already on the line, which is not a change
  // worth a request.
  if (!isMounted.value || !variant || variant.id === item.variant.id) {
    return
  }

  emit('change', variant.id)
}

const variantPicker =
  useTemplateRef<InstanceType<typeof SFVariantPicker>>('variantPicker')

defineExpose({
  /**
   * Moves keyboard focus to the picker's trigger. The basket page calls it on
   * the replacement line after a size change, where the card holding the
   * trigger the customer used has been unmounted.
   *
   * The picker renders unconditionally here, so this always has a trigger to
   * focus. Whether a line offers one at all is decided a level up, by the
   * `v-if` in `SFBasketCardDetails`, which is where the caller's fallback is
   * reported from.
   */
  focus: () => variantPicker.value?.focus(),
})
</script>
