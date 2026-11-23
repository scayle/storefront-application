<template>
  <!-- The overlay mounts the modal already open on its first open, so `appear` keeps the fade-in on that mount. -->
  <SFModal
    v-model:visible="open"
    appear
    :headline="$t('price.information.headline')"
    :size="ModalSize.SM"
    data-testid="price-info-modal"
  >
    <div class="flex flex-col gap-5">
      <div data-testid="price-info-row-current">
        <p class="body-default">{{ $t('price.information.current_cost') }}</p>
        <p class="mt-1.5">
          <span
            class="font-semibold"
            :class="price.isOnSale ? 'text-product-sale' : 'text-primary'"
          >
            <span v-if="hasDifferentPrices"
              >{{ $t('price.starting_from') }}
            </span>
            {{ price.finalPrice }}
          </span>
          <span class="ms-1.5 disclaimer">{{ taxLabel }}</span>
        </p>
      </div>

      <div v-if="price.showOriginally" data-testid="price-info-row-original">
        <p class="body-default">{{ $t('price.information.first_offered') }}</p>
        <p class="mt-1.5 body-default-secondary">{{ price.originalPrice }}</p>
      </div>

      <div
        v-if="price.showLowestPriorPriceLine && price.lowestPriorPrice"
        data-testid="price-info-row-lowest"
      >
        <p class="body-default">{{ $t('price.information.lowest_30_days') }}</p>
        <p class="mt-1.5 body-default-secondary">
          {{ price.lowestPriorPrice.withTax }}
        </p>
      </div>

      <div
        v-if="price.isOnSale && price.saleReductionInCents"
        data-testid="price-info-row-sale"
      >
        <p class="body-default">{{ $t('price.sale_label') }}</p>
        <p class="mt-1.5 body-default-secondary text-product-sale">
          {{ saleReductionSigned }}
        </p>
      </div>

      <div
        v-if="campaign && price.campaignReductionInCents"
        data-testid="price-info-row-campaign"
      >
        <p class="body-default">
          {{
            $t('price.information.campaign_label', { name: campaign.headline })
          }}
        </p>
        <p class="mt-1.5 body-default-secondary text-product-sale">
          {{ campaignReductionSigned }}
        </p>
      </div>

      <div
        v-for="promotion in promotions"
        :key="promotion.id"
        data-testid="price-info-row-promotion"
      >
        <p class="body-default">
          {{
            $t('price.information.promotion_label', {
              name: promotion.headline,
            })
          }}
        </p>
        <p class="mt-1.5 body-default-secondary">
          {{ $t('price.information.see_in_basket') }}
        </p>
      </div>
    </div>
  </SFModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@client/composables/usePage'
import { useI18n } from 'vue-i18n'
import type { VariantPrice, Promotion } from '@scayle/storefront/types'
import type { StorefrontCountry } from '@scayle/storefront/config'
import { formatCurrency } from '@shared/utils/formatter'
import { ModalSize } from '@client/utils/constants'
import SFModal from '@client/components/ui/core/SFModal.vue'

const { price, promotions = [] } = defineProps<{
  /**
   * Price whose discount breakdown is explained in the modal. `ProductPrice`
   * is assignable here since it extends `VariantPrice`.
   */
  price: VariantPrice
  /**
   * Promotions applicable to this product, surfaced as "see the final price in
   * the basket" rows. Pass the product-filtered list (e.g. from
   * `useProductPromotions`); their effect applies at the basket, so no
   * per-product amount is shown here.
   */
  promotions?: Promotion[]
}>()

/** Whether the modal is open. Bind with `v-model:open`. */
const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()

const page = usePage()
const campaign = computed(() => page.props.campaign ?? null)

const hasDifferentPrices = computed(
  () => 'hasDifferentPrices' in price && price.hasDifferentPrices,
)

const taxLabel = computed(() =>
  price.tax?.amountInCents
    ? t('global.including_vat')
    : t('global.excluding_vat'),
)

// Per-unit reductions carry positive `*InCents` magnitudes; render them as
// signed (negative) deductions at the call site.
const saleReductionSigned = computed(() =>
  formatCurrency(
    price.saleReductionInCents ?? 0,
    page.props.storefront.country as StorefrontCountry,
    { signed: true },
  ),
)

const campaignReductionSigned = computed(() =>
  formatCurrency(
    price.campaignReductionInCents ?? 0,
    page.props.storefront.country as StorefrontCountry,
    { signed: true },
  ),
)
</script>
