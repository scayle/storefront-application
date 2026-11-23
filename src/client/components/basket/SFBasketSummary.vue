<template>
  <aside
    class="relative rounded-xl bg-gray-100 leading-4 max-lg:overflow-hidden lg:w-2/5 lg:px-5 lg:py-8"
    data-testid="basket-summary"
    :aria-labelledby="basketSummaryTotalHeadlineId"
  >
    <section class="sticky top-8 z-10 flex w-full flex-col gap-4 text-md/4">
      <div class="px-5">
        <div class="flex w-full flex-col gap-4 pt-8 leading-4 lg:p-0">
          <h2
            :id="basketSummaryTotalHeadlineId"
            class="heading-section-1"
            data-testid="basket-summary-headline"
          >
            {{ t('basket_summary.total') }}
          </h2>

          <div class="flex w-full justify-between text-lg">
            <h3 class="flex items-center gap-2 leading-tight">
              {{ t('basket_summary.subtotal') }}
            </h3>
            <span data-testid="basket-summary-subtotal">
              {{ basket.cost.subtotal }}
            </span>
          </div>

          <div class="flex w-full justify-between text-lg">
            <h3 class="flex items-center gap-2 leading-tight">
              {{ t('basket_summary.delivery') }}
            </h3>
            <span data-testid="basket-summary-delivery">
              {{ deliveryCosts.value }}
            </span>
          </div>
        </div>

        <div
          class="mt-4 flex w-full max-w-none flex-col gap-4 border-gray-300 pb-5 lg:border-none lg:pb-0"
        >
          <SFBasketSummaryReductions
            v-if="basket.cost.hasReductions"
            :basket="basket"
            :campaign="campaign"
          />

          <hr class="h-px w-full border-none bg-gray-400 lg:w-auto" />

          <div class="flex flex-col gap-4 text-xl/4 font-semibold lg:px-0">
            <div class="flex items-start justify-between font-semibold">
              <h3>
                {{ t('basket_summary.you_pay') }}
              </h3>
              <div
                class="flex flex-col items-end gap-1"
                aria-live="polite"
                aria-atomic="true"
              >
                <span data-testid="basket-final-price">
                  {{ basket.cost.finalPrice }}
                </span>
                <span
                  data-testid="basket-vat-label"
                  class="body-default-secondary"
                >
                  {{
                    basket.cost.tax?.amountInCents
                      ? t('global.including_vat')
                      : t('global.excluding_vat')
                  }}
                </span>
              </div>
            </div>

            <SFButton
              data-testid="checkout-link"
              variant="accent"
              size="xl"
              is-full-width
              class="mt-2 text-center"
              :to="routes.checkout"
            >
              {{ t('basket.go_to_checkout') }}
            </SFButton>
            <SFExpressCheckoutBasket
              :access-token="accessToken"
              :checkout-jwt="checkoutJwt"
            />
          </div>
        </div>

        <SFBasketPromotionCodes
          class="mt-5"
          :promotion-codes="basket.promotionCodes"
        />

        <div class="mt-[-15px] w-full max-w-none">
          <p
            class="pt-8 body-default-secondary max-lg:pb-8"
            data-testid="basket-summary-delivery-disclaimer"
          >
            {{ deliveryCosts.disclaimer }}
          </p>
        </div>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/basket
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import SFButton from '@client/components/ui/core/SFButton.vue'
import type { Basket, Campaign } from '@scayle/storefront/types'
import type { DeliveryCosts } from '@shared/types/customData'
import { routes } from '@shared/routes'
import SFBasketPromotionCodes from '@client/components/basket/promotions/SFBasketPromotionCodes.vue'
import SFExpressCheckoutBasket from '../checkout/SFExpressCheckoutBasket.vue'
import SFBasketSummaryReductions from './promotions/SFBasketSummaryReductions.vue'

const { t } = useI18n()

const basketSummaryTotalHeadlineId = useId()

defineProps<{
  /** Mapped basket data used to render totals and VAT state. */
  basket: Basket
  /**
   * Delivery line from Panel shop custom data or server fallback: `value` is the
   * delivery price shown next to the delivery row, `disclaimer` the note beneath
   * the summary.
   */
  deliveryCosts: DeliveryCosts
  /** Active campaign context used for basket reductions display. */
  campaign?: Campaign | null
  /** Access token for the user. */
  accessToken: string
  /** Checkout JWT for the current basket. */
  checkoutJwt: string
}>()
</script>
