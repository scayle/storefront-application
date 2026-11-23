<template>
  <button
    type="button"
    aria-haspopup="dialog"
    class="group/price -mx-1 cursor-pointer rounded-sm px-1 transition-colors hover:bg-gray-100 aria-busy:animate-pulse aria-busy:cursor-progress motion-reduce:aria-busy:opacity-50"
    v-bind="triggerAttrs"
    @click="open()"
  >
    <slot />
    <IconCommercePriceInfo
      class="size-4 shrink-0 translate-y-px self-center fill-current text-secondary group-hover/price:text-primary"
      aria-hidden="true"
      data-testid="price-info-trigger"
    />
    <span class="sr-only">{{ $t('price.info_trigger_a11y') }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * Price row of `SFProductPrice` that opens the Price Information modal.
 * `SFProductPrice` renders it only for a price that has the modal, so a price
 * without one creates no overlay.
 */
import type {
  VariantPrice,
  ProductPrice,
  Promotion,
} from '@scayle/storefront/types'
import IconCommercePriceInfo from '@assets/icons/commerce/price-info.svg'
import { useOverlay } from '@client/composables/useOverlay'

const { price, promotions } = defineProps<{
  /** Price the modal breaks down. */
  price: VariantPrice | ProductPrice
  /** Promotions applicable to this product, listed in the modal. */
  promotions: Promotion[]
}>()

const { triggerAttrs, open } = useOverlay().create(
  () => import('./SFPriceInfoModal.vue'),
  { props: () => ({ price, promotions }) },
)
</script>
