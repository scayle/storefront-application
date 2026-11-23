<template>
  <SFButton
    v-bind="$attrs"
    size="xl"
    :variant="ButtonVariant.PLAIN"
    class="group rounded-md border-none bg-transparent p-1! text-secondary! transition duration-150 ease-in-out hover:scale-110 hover:bg-gray-300"
    :data-testid="
      isInWishlist
        ? 'remove-item-from-wishlist-button'
        : 'add-item-to-wishlist-button'
    "
    :aria-label="
      isInWishlist
        ? $t('wishlist_toggle.a11y.remove_from_wishlist', {
            name: product.name,
          })
        : $t('wishlist_toggle.a11y.add_to_wishlist', { name: product.name })
    "
    :aria-disabled="isBusy || undefined"
    @click="onToggleWishlist"
  >
    <template #prepend-icon>
      <IconWishlist
        v-if="(!isInWishlist && !isBusy) || (isInWishlist && isBusy)"
        :class="[restingIconClass, iconClass]"
      />
      <IconWishlisted v-else class="fill-accent" :class="iconClass" />
    </template>
  </SFButton>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ListingProduct, DetailedProduct } from '@scayle/storefront/types'
import type { AnalyticsProductListType } from '@scayle/storefront-api'
import IconWishlist from '@assets/icons/commerce/wishlist.svg'
import IconWishlisted from '@assets/icons/commerce/wishlisted.svg'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { ButtonVariant } from '@client/utils/constants'
import { useWishlist } from '@client/composables/useWishlist'
import { useWishlistEvents } from '@client/composables/tracking/useWishlistEvents'

defineOptions({ inheritAttrs: false })

type WishlistProduct = DetailedProduct | ListingProduct

const {
  product,
  productListType,
  productListId,
  index,
  iconClass = 'size-4!',
  restingIconClass = 'fill-secondary group-hover:fill-primary',
} = defineProps<{
  /**
   * The product to toggle.
   */
  product: WishlistProduct
  /**
   * SCAYLE Analytics surface the product is added to the wishlist from, sent as
   * `product_list_type` on `add_to_wishlist`: the list type of the surrounding
   * grid or slider, `basket` on the basket card, `gift_selection` in the gift
   * pop-up. `null` on the PDP, whose main item has no list surface.
   */
  productListType: AnalyticsProductListType | null
  /**
   * SCAYLE Analytics identifier within the surface (category id, search term,
   * slider id, promotion id), sent as `product_list_id`. Omit where the
   * surface carries none; `null` next to a `null` surface on the PDP.
   */
  productListId?: string | null
  /**
   * Tailwind size utility applied to the heart icon (both states). Defaults to
   * `size-4!` (16px); the product actions block passes `size-5` (20px) and the
   * PDP gallery overlay passes `size-6!` (24px).
   */
  iconClass?: string
  /**
   * Tailwind classes for the not-in-wishlist (outline) heart, typically its
   * fill color. Defaults to `fill-secondary group-hover:fill-primary`. The
   * in-wishlist heart always renders in the accent color, so this does not
   * affect it. The PDP gallery overlay passes `fill-primary` to match the
   * back button.
   */
  restingIconClass?: string
  /**
   * 1-based position of the product in the surfacing list (slider, grid,
   * wishlist page). Forwarded onto `ecommerce.items[0].index` of the fired
   * `add_to_wishlist` event. Omit on single-product surfaces (PDP, basket
   * card, modal).
   */
  index?: number
}>()

const { hasProductInWishlist, toggleItem, isProductToggling } = useWishlist()
const { trackAddToWishlist } = useWishlistEvents()
const isLocalToggling = ref(false)

const isInWishlist = computed(() => hasProductInWishlist(product.id))
const isBusy = computed(
  () => isLocalToggling.value || isProductToggling(product.id),
)

const onToggleWishlist = async () => {
  if (isBusy.value) {
    return
  }

  isLocalToggling.value = true

  try {
    const { added, error } = await toggleItem(product.id)

    if (error) {
      return
    }

    if (added) {
      trackAddToWishlist(
        product,
        { product_list_type: productListType, product_list_id: productListId },
        index,
      )
    }
  } finally {
    isLocalToggling.value = false
  }
}
</script>
