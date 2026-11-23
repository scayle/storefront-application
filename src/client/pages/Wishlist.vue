<template>
  <PageMetaHead :meta="meta" />
  <div class="container py-8">
    <Deferred data="wishlist">
      <template #fallback>
        <SFWishlistHeadline
          :heading-id="titleHeadingId"
          :count="wishlist?.items?.length ?? 0"
        />
        <div
          class="mt-8 grid w-full grid-cols-12 gap-4"
          data-testid="wishlist-skeleton"
        >
          <div
            v-for="n in 4"
            :key="n"
            class="col-span-6 mb-5 h-80 animate-pulse rounded-lg bg-gray-100 md:col-span-4 xl:col-span-3"
          />
        </div>
      </template>

      <template v-if="wishlist?.items?.length">
        <SFWishlistHeadline
          :heading-id="titleHeadingId"
          :count="wishlist.items.length"
        />
        <ul
          class="mt-8 grid w-full grid-cols-12 gap-4"
          data-testid="wishlist-grid"
          :aria-labelledby="titleHeadingId"
        >
          <li
            v-for="(item, index) in wishlist.items"
            :key="item.key"
            class="col-span-6 mb-5 md:col-span-4 xl:col-span-3"
            data-testid="wishlist-item"
          >
            <SFProductCard
              :ref="(el) => setCardRef(item.key, el)"
              class="w-full"
              :product="item.product"
              product-list-type="wishlist"
              :product-index="index"
              @intersect-product="onProductIntersects(index)"
              @select-product="onProductSelect(item.product, index)"
            />
          </li>
        </ul>
      </template>
      <SFEmptyWishlist v-else ref="emptyState" />
    </Deferred>
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/wishlist
import { nextTick, useId, useTemplateRef, watch } from 'vue'
import { Deferred } from '@inertiajs/vue3'
import { useI18n } from 'vue-i18n'
import {
  useAnnouncer,
  ANNOUNCE_DEBOUNCE_MS,
} from '@client/composables/useAnnouncer'
import SFProductCard from '@client/components/product/SFProductCard.vue'
import SFWishlistHeadline from '@client/components/wishlist/SFWishlistHeadline.vue'
import { useProductListTracking } from '@client/composables/tracking/useProductListTracking'
import type { ListingProduct, Wishlist } from '@scayle/storefront/types'
import SFEmptyWishlist from '@client/components/wishlist/SFEmptyWishlist.vue'
import { SEOMeta } from '@shared/types/SEO'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'

const { t } = useI18n()
const { announce } = useAnnouncer()

const { wishlist } = defineProps<{
  meta: SEOMeta
  wishlist: Wishlist
}>()

const { onProductIntersects, onProductSelect } = useProductListTracking(
  () => wishlist?.items?.map((item) => item.product) ?? [],
  { productListType: 'wishlist' },
)

// Links the items `<ul>` to the headline `<h1>` so AT announces the list with
// its name and item count.
const titleHeadingId = useId()

const emptyStateRef = useTemplateRef<{ $el: HTMLElement }>('emptyState')

// Keyed refs to the product cards so a removal can move focus to a neighbor
// via the card's exposed `focus()`. Function ref: set on mount, delete on unmount.
const cardRefs = new Map<string, { focus: () => void }>()
const setCardRef = (key: string, el: unknown) => {
  if (el) {
    cardRefs.set(key, el as { focus: () => void })
  } else {
    cardRefs.delete(key)
  }
}

// A removed item unmounts its card, dropping keyboard focus into body-limbo.
// Move focus to the adjacent card (its exposed `focus()`), or the empty-state
// CTA once the list is empty.
const restoreFocus = (adjacentKey: string | undefined) => {
  nextTick(() => {
    const card = adjacentKey ? cardRefs.get(adjacentKey) : undefined
    if (card) {
      card.focus()
      return
    }

    emptyStateRef.value?.$el?.querySelector<HTMLElement>('a, button')?.focus()
  })
}

// Removing a wishlist item triggers a partial reload that unmounts its toggle
// before it could emit, so the removal is detected by diffing the items list.
// The diff yields the removed product (for the announcement) and the adjacent
// item key (for focus restoration) from the previous list.
let previousItems: { key: string; product: ListingProduct }[] = []
watch(
  () => wishlist?.items,
  (items) => {
    if (!items) {
      return
    }

    if (items.length < previousItems.length) {
      const currentKeys = new Set(items.map((item) => item.key))
      const removedIndex = previousItems.findIndex(
        (item) => !currentKeys.has(item.key),
      )
      const removed = previousItems[removedIndex]
      const adjacent =
        previousItems[removedIndex - 1] ?? previousItems[removedIndex + 1]

      if (removed) {
        // Debounced so rapid removals coalesce into a single announcement.
        announce(
          t('wishlist_toggle.a11y.removed_announcement', {
            name: removed.product.name,
          }),
          { debounce: ANNOUNCE_DEBOUNCE_MS },
        )
        restoreFocus(adjacent?.key)
      }
    }

    // Snapshot (not the live reference) so the next diff still sees the old
    // list even if a future update mutates the array in place rather than
    // replacing it the way `partialReload` currently does.
    previousItems = [...items]
  },
  { immediate: true },
)
</script>
