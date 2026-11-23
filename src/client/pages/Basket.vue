<template>
  <PageMetaHead :meta="meta" />
  <div class="container flex flex-col py-8">
    <template v-if="count">
      <div
        class="relative flex flex-col gap-6 lg:flex-row lg:items-stretch"
        data-testid="basket-container"
      >
        <div class="flex flex-3 flex-col space-y-4 lg:space-y-8">
          <SFBasketHeadline :count="count" />
          <section
            v-if="campaign || banners?.length"
            :aria-label="$t('basket.a11y.active_promotions')"
            class="flex w-full flex-col gap-6 lg:max-w-160"
          >
            <SFDealBanner
              v-if="showCampaign && campaign"
              :deal="campaign"
              :show-text-box="false"
              :placement="
                getDealPlacement('basket_banner', banners, true, 'campaign')
              "
            />
            <SFDealBanner
              v-for="(promotion, index) in banners"
              :key="promotion.id"
              :deal="promotion"
              :placement="
                getDealPlacement('basket_banner', banners, showCampaign, index)
              "
            />
          </section>

          <SFGiftPromotionProducts
            v-for="giftPromotion in giftPromotions"
            :key="giftPromotion.promotion.id"
            :gift-promotion="giftPromotion"
            class="w-full lg:max-w-160 lg:min-w-112"
          />
          <ul
            class="flex w-full flex-col items-end pt-px lg:max-w-160 lg:min-w-112"
          >
            <SFBasketCard
              v-for="item in basket?.availableItems"
              :ref="(el) => setCardRef(item.key, el)"
              :key="item.key"
              class="w-full"
              :item="item"
              :campaign="campaign"
              :loading="loadingBasketItems.get(item.key)"
              @update-quantity="changeItemQuantity(item, $event)"
              @change-variant="changeBasketItemVariant(item, $event)"
              @delete="deleteBasketItem(item.key)"
            />
          </ul>
          <template v-if="basket?.unavailableItems.length">
            <h2
              :id="unavailableHeadingId"
              class="z-10 w-full rounded-lg border border-gray-300 bg-gray-100 px-5 py-2.5 heading-section-3 lg:max-w-160"
              data-testid="headline-unavailable-products"
            >
              {{ $t('basket.unavailable_products') }}:
            </h2>
            <ul
              :aria-labelledby="unavailableHeadingId"
              data-testid="unavailable-product-list"
              class="flex w-full flex-col items-end pt-px lg:max-w-160 lg:min-w-112 lg:-translate-y-10"
            >
              <SFBasketCard
                v-for="item in basket?.unavailableItems"
                :ref="(el) => setCardRef(item.key, el)"
                :key="item.key"
                class="w-full lg:first:rounded-t-none! lg:first:border-t-0! lg:first:pt-6"
                :item="item"
                :campaign="campaign"
                :loading="loadingBasketItems.get(item.key)"
                @update-quantity="changeItemQuantity(item, $event)"
                @change-variant="changeBasketItemVariant(item, $event)"
                @delete="deleteBasketItem(item.key)"
              />
            </ul>
          </template>
        </div>
        <SFBasketSummary
          v-if="basket"
          class="flex-2 lg:mt-6 lg:space-y-8"
          :basket="basket"
          :delivery-costs="deliveryCosts"
          :access-token="accessToken"
          :checkout-jwt="checkoutJwt"
          :campaign="campaign"
        />
      </div>
    </template>
    <template v-else>
      <SFEmptyBasket ref="emptyBasket" />
    </template>
  </div>

  <SFBasketDeleteConfirmationModal
    v-model:visible="isDeleteConfirmationRevealed"
    @confirm="confirmDeletion"
    @cancel="cancelDeletion"
  />
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/basket
import { computed, onMounted, useId, useTemplateRef, watch } from 'vue'
import SFEmptyBasket from '@client/components/basket/SFEmptyBasket.vue'
import SFBasketCard from '@client/components/basket/SFBasketCard.vue'
import SFBasketHeadline from '@client/components/basket/SFBasketHeadline.vue'
import { useBasketPromotionBanners } from '@client/composables/useBasketPromotionBanners'
import type { Basket, GiftPromotion } from '@scayle/storefront/types'
import { useBasketEvents } from '@client/composables/tracking/useBasketEvents'
import { usePage } from '@client/composables/usePage'
import SFBasketDeleteConfirmationModal from '@client/components/basket/SFBasketDeleteConfirmationModal.vue'
import SFBasketSummary from '@client/components/basket/SFBasketSummary.vue'
import type { DeliveryCosts } from '@shared/types/customData'
import SFDealBanner from '@client/components/deal/SFDealBanner.vue'
import { getDealPlacement } from '@client/utils/promotion'
import SFGiftPromotionProducts from '@client/components/product/promotion/gift/SFGiftPromotionProducts.vue'
import type { SEOMeta } from '@shared/types/SEO'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import { useBasketItemActions } from '@client/composables/useBasketItemActions'
import { useBasketItemFocus } from '@client/composables/useBasketItemFocus'

interface Props {
  /**
   * The page's own basket. Overrides the deferred shared basket so the lines
   * can render from the first HTML. The controller sends it with the first
   * response. `undefined` only if a render reaches the page without one.
   */
  basket?: Basket
  accessToken: string
  checkoutJwt: string
  deliveryCosts: DeliveryCosts
  giftPromotions: GiftPromotion[]
  meta: SEOMeta
}

const { basket, accessToken, checkoutJwt, meta, deliveryCosts } =
  defineProps<Props>()

const { banners } = useBasketPromotionBanners(() => basket)
const { trackViewBasket } = useBasketEvents()
// Read off the page's own basket rather than `useBasket`, which reads the
// shared prop: the headline and the `v-if` gate must agree with the lines this
// page actually renders.
const count = computed(() => basket?.itemCount ?? 0)

const unavailableHeadingId = useId()

/**
 * Every line the page renders, in the order the cards appear: the available
 * list first, then the unavailable one. Focus restoration reads positions off
 * this order, so it has to agree with the template.
 */
const renderedItems = computed(() => [
  ...(basket?.availableItems ?? []),
  ...(basket?.unavailableItems ?? []),
])

const emptyBasketRef = useTemplateRef<{ $el: HTMLElement }>('emptyBasket')

const { setCardRef, restoreFocusAfterRemoval, restoreFocusAfterVariantChange } =
  useBasketItemFocus(renderedItems, emptyBasketRef)

const {
  loadingItems: loadingBasketItems,
  updateQuantity: changeItemQuantity,
  changeVariant: changeBasketItemVariant,
  requestRemoval: deleteBasketItem,
  isRemovalConfirmationRevealed: isDeleteConfirmationRevealed,
  confirmRemoval: confirmDeletion,
  cancelRemoval: cancelDeletion,
} = useBasketItemActions({
  renderedItems,
  restoreFocusAfterRemoval,
  restoreFocusAfterVariantChange,
})

// Fires `view_cart` and `view_basket` once per basket page visit. The page
// prop arrives with the first response, so the first branch normally wins.
// The watcher covers a render that reaches mount without a basket, and
// stops on the first one it sees.
onMounted(() => {
  if (basket) {
    trackViewBasket(basket)
    return
  }
  const stop = watch(
    () => basket,
    (current) => {
      if (!current) {
        return
      }
      trackViewBasket(current)
      stop()
    },
  )
})

const page = usePage()
const campaign = computed(() => page.props.campaign ?? null)

const showCampaign = computed(() =>
  Boolean(campaign.value && basket?.cost.hasCampaignReduction),
)
</script>
