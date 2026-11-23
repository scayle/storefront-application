<template>
  <SFLink
    :to="routes.wishlist"
    raw
    class="relative flex size-9.5 items-center justify-center rounded-md p-2 hover:bg-gray-200"
    data-testid="wishlist-link"
    :aria-label="$t('wishlist_page.a11y.title', count)"
  >
    <IconWishlist class="size-6" />
    <SFCountBadge
      :count="count"
      variant="corner"
      aria-hidden="true"
      data-testid="header-wishlist-count"
    />
  </SFLink>
</template>

<script setup lang="ts">
import IconWishlist from '@assets/icons/commerce/wishlist.svg'
import SFCountBadge from '@client/components/ui/core/SFCountBadge.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import { routes } from '@shared/routes'
import { useWishlist } from '@client/composables/useWishlist'

const { count } = useWishlist()
</script>
