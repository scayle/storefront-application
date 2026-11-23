<template>
  <SFLink
    id="header-basket"
    :to="routes.basket"
    raw
    class="relative flex size-9.5 items-center justify-center rounded-md p-2 hover:bg-gray-200"
    data-testid="basket-link"
    :aria-label="$t('basket_page.a11y.title', count)"
  >
    <IconBasket class="size-6 fill-primary" />
    <SFCountBadge
      :count="count"
      variant="corner"
      aria-hidden="true"
      data-testid="header-basket-count"
    />
  </SFLink>
</template>

<script setup lang="ts">
import IconBasket from '@assets/icons/commerce/basket.svg'
import { routes } from '@shared/routes'
import { useBasket } from '@client/composables/useBasket'
import SFCountBadge from '@client/components/ui/core/SFCountBadge.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'

const { count } = useBasket()
</script>
