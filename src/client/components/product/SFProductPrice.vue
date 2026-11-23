<template>
  <div
    class="flex flex-col"
    :class="[rootAlignClass, compact ? 'gap-0.5' : 'gap-1']"
  >
    <component
      :is="isClickable ? SFPriceInfoButton : 'p'"
      class="m-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5"
      :class="[priceRowAlignClass, priceSizeClass]"
      data-testid="price"
      v-bind="isClickable ? { price, promotions } : undefined"
    >
      <span
        :lang="locale"
        class="font-semibold"
        :class="finalPriceClass"
        data-testid="final-price"
      >
        <span v-if="showStartingFrom">{{ $t('price.starting_from') }} </span>
        {{ price.finalPrice }}
      </span>

      <span
        v-if="showTaxInfo"
        :class="[secondaryRowClass, secondaryAlignClass]"
        data-testid="tax-info"
      >
        {{ taxLabel }}
      </span>
    </component>

    <span
      v-if="showOriginally"
      class="text-sm lg:text-md"
      :class="[secondaryRowClass, secondaryAlignClass]"
      data-testid="originally-row"
    >
      {{ $t('price.originally') }}
      <span :class="{ 'line-through': price.strikeOriginally }">
        {{ price.originalPrice }}
      </span>
      <span
        v-if="price.strikeOriginally && price.totalReduction"
        class="ms-1.5 font-semibold text-product-sale"
        data-testid="total-reduction"
      >
        {{ price.totalReduction }}
      </span>
    </span>

    <span
      v-if="showLastLowestPrice"
      class="text-sm lg:text-md"
      :class="[secondaryRowClass, secondaryAlignClass]"
      data-testid="lowest-prior-price"
    >
      {{ $t('price.30_day_best_price') }}
      <span :class="{ 'line-through': price.strikeLowestPriorPrice }">
        {{ price.lowestPriorPrice!.withTax }}
      </span>
      <span
        v-if="price.strikeLowestPriorPrice && price.totalReduction"
        class="ms-1.5 font-semibold text-product-sale"
        data-testid="total-reduction"
      >
        {{ price.totalReduction }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  VariantPrice,
  ProductPrice,
  Promotion,
} from '@scayle/storefront/types'
import { Size } from '@client/utils/constants'
import { useI18n } from 'vue-i18n'
import SFPriceInfoButton from './SFPriceInfoButton.vue'

const {
  showTaxInfo = false,
  size = Size.MD,
  price,
  inline = true,
  showStrikeThroughPrice = false,
  showLowestPriorPrice = false,
  promotions = [],
  compact = false,
} = defineProps<{
  /** Price data with final price and optional reductions. */
  price: VariantPrice | ProductPrice
  /** Whether to display the VAT info next to the final price. */
  showTaxInfo?: boolean
  /** Controls the text size of the final price. */
  size?: (typeof Size)[keyof typeof Size]
  /**
   * Left-aligns the labeled rows when `true` (PLP/PDP); right-aligns them when
   * `false` (basket line item, where the price column hugs the right edge).
   */
  inline?: boolean
  /**
   * Renders the final price with strike-through styling (e.g. a free gift whose
   * regular price is shown crossed out). Suppresses the labeled breakdown rows.
   */
  showStrikeThroughPrice?: boolean
  /** Whether to display the "last lowest price (30 days)" row when available. */
  showLowestPriorPrice?: boolean
  /**
   * Tightens the vertical gap between the price row and the labeled rows below
   * (0.125rem instead of 0.25rem). Used on the product tile where space is tight.
   */
  compact?: boolean
  /**
   * Promotions applicable to this product, forwarded to the Price Information
   * modal so its promotion rows are product-specific (not the page-wide list).
   * Resolve via `getPromotionsForProduct` / `useProductPromotions`.
   */
  promotions?: Promotion[]
}>()

const { t, locale } = useI18n()

const FINAL_SIZE_CLASS = {
  [Size.SM]: 'text-sm',
  [Size.MD]: 'text-md',
  [Size.LG]: 'text-lg',
  [Size.XL]: 'text-2xl',
} as const satisfies Partial<Record<(typeof Size)[keyof typeof Size], string>>

const priceSizeClass = computed(
  () => FINAL_SIZE_CLASS[size] ?? FINAL_SIZE_CLASS[Size.MD],
)

/**
 * Secondary breakdown rows (tax, "originally", "last lowest price") use the
 * compact `disclaimer` style everywhere except the PDP `xl` size, where the
 * design calls for a slightly larger 14px secondary line.
 */
const secondaryRowClass = computed(() =>
  size === Size.XL ? 'body-default-secondary' : 'disclaimer',
)

const showStartingFrom = computed(
  () => 'hasDifferentPrices' in price && price.hasDifferentPrices,
)

/** Final price is red when on sale or when it varies across variants. */
const finalPriceClass = computed(() => {
  if (showStrikeThroughPrice) {
    return 'text-secondary line-through'
  }
  return price.isOnSale ? 'text-product-sale' : 'text-primary'
})

/** The whole price row opens the Price Information modal. */
const isClickable = computed(
  () => price.isOnSale && showTaxInfo && !showStrikeThroughPrice,
)

const showOriginally = computed(
  () => price.showOriginally && !showStrikeThroughPrice,
)

const showLastLowestPrice = computed(
  () =>
    showLowestPriorPrice &&
    price.showLowestPriorPriceLine &&
    Boolean(price.lowestPriorPrice) &&
    !showStrikeThroughPrice,
)

const rootAlignClass = computed(() => (inline ? 'items-start' : 'items-end'))

const priceRowAlignClass = computed(() =>
  inline ? 'justify-start' : 'justify-end',
)

const secondaryAlignClass = computed(() => (inline ? '' : 'text-end'))

const taxLabel = computed(() =>
  price.tax?.amountInCents
    ? t('global.including_vat')
    : t('global.excluding_vat'),
)
</script>
