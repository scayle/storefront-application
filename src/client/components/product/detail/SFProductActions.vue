<template>
  <div
    v-if="product.isSoldOut"
    class="rounded-xl bg-status-alert/5 p-4 text-md text-status-alert"
  >
    {{ $t('common.sold_out_long') }}
  </div>
  <div
    v-else-if="
      product.sellableTimeframe.state === 'future' ||
      product.sellableTimeframe.state === 'past'
    "
    class="rounded-xl bg-status-warning/10 p-4 text-md text-primary"
  >
    <template v-if="product.sellableTimeframe.state === 'future'">
      {{ $t('product_detail.sellable_in_future') }}
    </template>
    <template v-else-if="product.sellableTimeframe.state === 'past'">
      {{ $t('product_detail.sellable_in_past') }}
    </template>
  </div>
  <div v-else>
    <div class="heading-section-2">{{ $t('product_attribute.size') }}:</div>
    <div class="my-3 mt-4 flex h-12 items-center space-x-4">
      <SFVariantPicker
        ref="variantPicker"
        v-model:visible="isVariantListVisible"
        v-model:active-variant="activeVariant"
        :variants="product.variants"
        class="grow scroll-my-40"
      />
      <SFQuantityInput
        v-model:quantity="quantity"
        :max-quantity="maxQuantity"
        size="lg"
      />
    </div>
    <SFLowStockBanner size="large" :message="lowStockMessage" class="mt-5" />
  </div>
  <!-- Enforce client-side rendering for the "Add to Basket" button via `<ClientOnly />`. This prevents hydration mismatches caused by server/client timezone differences when rendering the button's date text. -->
  <ClientOnly>
    <template #fallback>
      <!-- The skeleton loaders are sized like the buttons that replace them, avoiding layout shifts -->
      <div class="flex gap-3 max-lg:hidden">
        <SFSkeletonLoader type="button" class="h-13! rounded-xl!" full-width />
        <SFSkeletonLoader type="button" class="size-13! shrink-0" />
      </div>
    </template>
    <div class="flex gap-3 max-lg:hidden">
      <SFButton
        variant="accent"
        size="xl"
        class="grow justify-between aria-disabled:cursor-not-allowed"
        data-testid="add-item-to-basket-button"
        :aria-disabled="isAddToBasketDisabled || undefined"
        @click="addItemToBasket($event)"
      >
        {{ addToBasketButtonText }}

        <template #append-icon>
          <div class="flex items-center space-x-1 pl-4">
            <IconIncrementPlus
              class="size-4! scale-x-0 fill-white transition-transform duration-150"
              :class="{ 'group-hover:scale-100': !isAddToBasketDisabled }"
            />
            <IconCommerceBasket class="size-5! fill-white" />
          </div>
        </template>
      </SFButton>

      <SFWishlistToggle
        :product="product"
        :product-list-type="null"
        :product-list-id="null"
        icon-class="size-5"
        class="size-13! bg-gray-200! hover:scale-100! hover:bg-gray-300! hover:text-primary!"
      />
    </div>
  </ClientOnly>
  <SFExpressCheckoutPDP
    v-if="isInSellableTimeframe && !isOutOfStock"
    :access-token="accessToken"
    :variant-id="activeVariant?.id"
    :quantity="quantity"
    @size-missing="onExpressSizeMissing"
  />
  <!-- As the "Add to Basket" button needs to be client-side rendered, we need to wrap the whole Teleport in a ClientOnly component to prevent hydration mismatches. -->
  <ClientOnly>
    <Teleport defer to="#teleports">
      <div class="fixed bottom-6 z-20 w-full lg:hidden">
        <div class="container flex items-center gap-x-3">
          <SFButton
            variant="accent"
            size="xl"
            class="group grow justify-between! aria-disabled:cursor-not-allowed"
            data-testid="add-to-basket-button-mobile"
            :aria-disabled="isAddToBasketDisabled || undefined"
            @click="addItemToBasket($event)"
          >
            <div class="flex w-full justify-between">
              {{ addToBasketButtonText }}
            </div>
            <template #append-icon>
              <div class="inline-flex w-40 items-center space-x-1 pr-4">
                <IconIncrementPlus
                  class="size-4! scale-x-0 fill-white transition-transform duration-150"
                  :class="{ 'group-hover:scale-100': !isAddToBasketDisabled }"
                />
                <IconCommerceBasket class="size-5! fill-white" />
              </div>
            </template>
          </SFButton>
          <SFScrollToTopButton />
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue'
import type { DetailedProduct, ProductVariant } from '@scayle/storefront/types'
import { useI18n } from 'vue-i18n'
import { formatDateTime } from '@shared/utils/formatter'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import IconIncrementPlus from '@client/assets/icons/increment/plus.svg'
import IconCommerceBasket from '@client/assets/icons/commerce/basket.svg'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFSkeletonLoader from '@client/components/ui/core/SFSkeletonLoader.vue'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import SFScrollToTopButton from '@client/components/SFScrollToTopButton.vue'
import SFQuantityInput from '@client/components/product/SFQuantityInput.vue'
import SFVariantPicker from '@client/components/product/SFVariantPicker.vue'
import SFWishlistToggle from '@client/components/product/SFWishlistToggle.vue'
import SFLowStockBanner from '@client/components/product/SFLowStockBanner.vue'
import { getMaxQuantity } from '@client/utils/product'
import { useBasket } from '@client/composables/useBasket'
import { useBasketEvents } from '@client/composables/tracking/useBasketEvents'
import { useElementVisibility, useEventListener } from '@vueuse/core'
import { useAnnouncer } from '@client/composables/useAnnouncer'
import SFExpressCheckoutPDP from '@client/components/checkout/SFExpressCheckoutPDP.vue'
import { EXPRESS_CHECKOUT_RESET_EVENT } from '@client/utils/expressCheckout'

/**
 * Multi-root template (the sold-out/timeframe/picker conditional chain, the
 * desktop and mobile button wrappers, and the express-checkout block). These
 * heterogeneous roots share no single DOM element, so fallthrough attributes are
 * consumed via `useAttrs` and deliberately not rendered.
 */
defineOptions({ inheritAttrs: false })
useAttrs()

const { product, accessToken } = defineProps<{
  product: DetailedProduct
  accessToken?: string
}>()

const activeVariant = defineModel<ProductVariant | undefined>('activeVariant')
const maxQuantity = computed(() => getMaxQuantity(activeVariant.value))
const isVariantListVisible = ref(false)
const quantity = defineModel<number>('quantity', { required: true })

const { t } = useI18n()
const { country } = useStorefrontConfig()

/**
 * Resolves the low-stock banner message. Returns the translated string when
 * the banner should be shown, or `undefined` to hide it. Variant-level
 * scarcity wins when a size is selected; otherwise product-level scarcity
 * falls back to the generic copy.
 */
const lowStockMessage = computed(() => {
  if (activeVariant.value?.isLowStock) {
    return t('low_stock.x_left', { count: activeVariant.value.stock })
  }
  if (!activeVariant.value && product.isLowStock) {
    return t('low_stock.few_items_left')
  }
  return undefined
})

const isOutOfStock = computed(
  () => product.isSoldOut || activeVariant.value?.isSoldOut === true,
)

const isInSellableTimeframe = computed(
  () => product.sellableTimeframe.state === 'active',
)

const isAddToBasketDisabled = computed(
  () => isOutOfStock.value || !isInSellableTimeframe.value,
)

// Doubles as the `aria-disabled` reason — generalizing this text means
// wiring `aria-describedby` to the state banner instead.
const addToBasketButtonText = computed(() => {
  const { sellableTimeframe } = product

  if (sellableTimeframe.state === 'future') {
    return t('add_to_basket.coming_soon', {
      startDate: formatDateTime(
        new Date(sellableTimeframe.sellableFrom),
        country.value.locale,
      ),
    })
  } else if (sellableTimeframe.state === 'past') {
    return t('add_to_basket.no_longer_available', {
      date: formatDateTime(
        new Date(sellableTimeframe.sellableTo),
        country.value.locale,
      ),
    })
  }
  if (isOutOfStock.value) {
    return t('global.sold_out')
  }
  return t('add_to_basket.add_to_basket')
})

const variantPicker = ref()
const isVariantPickerVisible = useElementVisibility(variantPicker, {
  threshold: 1,
})

/** Scrolls the picker into view and waits for the animation before opening the list. */
const scrollPickerIntoView = (el: HTMLElement) =>
  // Resolves on the `scrollend` DOM event, which has no promise-returning equivalent.
  // eslint-disable-next-line promise/avoid-new
  new Promise<void>((resolve) => {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    useEventListener(window, 'scrollend', () => resolve(), { once: true })
  })

/**
 * Opens the size dropdown for the express size gate: scroll the picker into
 * view first (same as add-to-basket), then show the list.
 */
const onExpressSizeMissing = async () => {
  const el = variantPicker.value?.$el as HTMLElement | undefined
  if (el && !isVariantPickerVisible.value) {
    await scrollPickerIntoView(el)
  }
  isVariantListVisible.value = true
}

// Dismissed via click-outside or Escape without picking a size: reset the
// express button. A real selection closes the dropdown with `activeVariant`
// set, so it skips the reset and lets the express flow resume.
watch(isVariantListVisible, (visible) => {
  if (visible || activeVariant.value) {
    return
  }
  document.dispatchEvent(new Event(EXPRESS_CHECKOUT_RESET_EVENT))
})

const { addItem } = useBasket()
const { trackAddToBasket } = useBasketEvents()
const { announce } = useAnnouncer()

const addItemToBasket = async (event?: MouseEvent) => {
  // `aria-disabled` keeps the button focusable — short-circuit here.
  if (isAddToBasketDisabled.value) {
    return
  }
  if (!activeVariant.value) {
    // No size selected: prompt the user via the shared live region.
    announce(t('add_to_basket.a11y.select_size'))
    const el = variantPicker.value?.$el as HTMLElement | undefined
    if (el && !isVariantPickerVisible.value) {
      await scrollPickerIntoView(el)
    }
    // Keyboard activation only (`detail === 0`) => focus the picker
    if (event?.detail === 0) {
      variantPicker.value?.focus()
    }
    isVariantListVisible.value = true
    return
  }
  const variant = activeVariant.value
  const added = await addItem({
    productName: product.name,
    variantId: variant.id,
    quantity: quantity.value,
  })
  if (added) {
    trackAddToBasket(variant, product, added)
  }
}
</script>
