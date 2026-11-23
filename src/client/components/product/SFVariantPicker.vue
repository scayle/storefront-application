<template>
  <SFDropdown
    :id="dropdownId"
    ref="dropdown"
    v-model="activeVariant"
    v-model:visible="isVariantListVisible"
    :items="variants"
    :size="size"
    :placeholder="$t('variant_picker.select_size')"
    :aria-label="ariaLabel ?? $t('variant_picker.select_size')"
    :disabled="disabled || variants.length <= 1"
    :is-option-disabled="(variant: ProductVariant) => variant.isSoldOut"
    data-testid="variant-picker"
  >
    <span
      v-if="activeVariant?.label"
      :class="[
        'font-semibold',
        activeVariant.isSoldOut ? 'text-secondary' : 'text-primary',
      ]"
    >
      {{ activeVariant.label }}
      <span v-if="activeVariant.isSoldOut" class="font-normal">
        ({{ $t('common.sold_out') }})
      </span>
    </span>
    <template
      #item="{
        item,
        selectItem,
        setActive,
        index,
        isSelected,
        isActive,
        isDisabled,
        id,
        size: optionSize,
      }"
    >
      <SFDropdownOptionItem
        :id="id"
        :type="DropdownOptionType.LEADING_RADIO"
        :size="optionSize"
        :selected="isSelected"
        :active="isActive"
        :disabled="isDisabled"
        :data-testid="`variant-option-${item.id}`"
        :aria-label="
          isDisabled
            ? `${$t('variant_picker.option.select_option', { option: item.label })}, ${$t('common.sold_out')}`
            : $t('variant_picker.option.select_option', { option: item.label })
        "
        @select="selectItem(item)"
        @mousemove="setActive(index)"
      >
        <span
          :class="[
            optionTextClass(optionSize),
            isDisabled ? 'text-gray-500' : 'text-primary',
          ]"
        >
          {{ item.label }}
        </span>
        <template #trailing>
          <div v-if="!isDisabled" class="flex items-center gap-1.5">
            <!--
              Styling deliberately mirrors SFReductionBadge. Kept as a local
              span rather than reusing the badge component: that would force a
              `Promotion` onto this generic picker and lose the plain-string
              `reductionLabel` decoupling.
            -->
            <span
              v-if="reductionLabel"
              :class="[
                optionTextClass(optionSize),
                'font-semibold text-product-sale',
              ]"
              data-testid="variant-reduction"
            >
              {{ reductionLabel }}
            </span>
            <span
              :class="[
                optionTextClass(optionSize),
                'font-normal',
                variantPriceClass(item),
              ]"
              data-testid="variant-price"
            >
              {{ item.price.finalPrice }}
            </span>
          </div>
          <span v-else class="text-lg text-gray-500">
            {{ $t('common.sold_out') }}
          </span>
        </template>
      </SFDropdownOptionItem>
    </template>
  </SFDropdown>
</template>

<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import type { ProductVariant } from '@scayle/storefront/types'
import SFDropdown from '@client/components/ui/form/SFDropdown.vue'
import SFDropdownOptionItem from '@client/components/ui/form/SFDropdownOptionItem.vue'
import {
  DropdownOptionSize,
  DropdownOptionType,
  DropdownSize,
} from '@client/utils/constants'

const {
  variants,
  strikeThroughPrice = false,
  reductionLabel,
  size = DropdownSize.LG,
  disabled = false,
} = defineProps<{
  /**
   * Array of available product variants with pricing and availability information.
   */
  variants: ProductVariant[]
  /**
   * Trigger size. Defaults to the large control the product detail page uses;
   * the basket card passes a smaller one to sit inline in its attribute list.
   * `SFDropdown` resolves the option size from the trigger, so the rows scale
   * with it: the basket's compact trigger opens compact rows, the product
   * detail page's full-size trigger opens full-size ones.
   */
  size?: DropdownSize
  /**
   * Renders each variant's price with strikethrough styling (gift selection,
   * where the chosen variant becomes free).
   */
  strikeThroughPrice?: boolean
  /**
   * Optional discount label (e.g. `-50%`) shown before each variant's price.
   * Used in the gift-selection modal so every size option carries the promotion
   * reduction, not just the crossed-out original price.
   */
  reductionLabel?: string
  /**
   * Blocks selection while a change the picker already triggered is still in
   * flight. A picker with one variant or none is disabled regardless: there is
   * nothing to pick.
   */
  disabled?: boolean
  /**
   * Accessible name for the trigger. Defaults to the generic "select size"
   * label, which is enough on a page holding one picker. A surface that renders
   * several — the basket, one per line — passes a name naming the product, so
   * they can be told apart.
   */
  ariaLabel?: string
}>()

/**
 * Identifies this picker's trigger, listbox and options. Per instance, because
 * `SFDropdown` builds all three id families from it and the basket renders one
 * picker per line.
 */
const dropdownId = useId()

/**
 * Resolves the colour treatment for a variant's final price in the dropdown:
 * struck when `strikeThroughPrice` is set, red when the variant is on sale,
 * otherwise the muted regular-price grey.
 */
const variantPriceClass = (variant: ProductVariant) => {
  if (strikeThroughPrice) {
    return 'text-secondary line-through'
  }
  return variant.price.isOnSale ? 'text-product-sale' : 'text-secondary'
}

/**
 * Text size for the slotted option content, matching the row size `SFDropdown`
 * resolved from the trigger. Without this the rows would shrink while their
 * label and price stayed large.
 */
const optionTextClass = (optionSize: DropdownOptionSize) =>
  optionSize === DropdownOptionSize.LG ? 'text-lg' : 'text-md'

const isVariantListVisible = defineModel<boolean>('visible', { default: false })

const activeVariant = defineModel<ProductVariant>('activeVariant')

// Preselects the only variant a product has, so its trigger shows a label
// instead of the placeholder. Skipped when the parent already passed a
// selection: on the basket the line's variant is always known, and overwriting
// it would emit a change the parent then has to suppress.
if (variants.length === 1 && !activeVariant.value) {
  activeVariant.value = variants[0]
}

// `SFDropdown` is a generic component, so type the exposed shape directly.
const dropdown = useTemplateRef<{ focus: () => void }>('dropdown')

defineExpose({
  focus: () => dropdown.value?.focus(),
})
</script>
