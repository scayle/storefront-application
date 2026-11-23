<template>
  <SFLink :to="routes.basket" raw class="group">
    <SFHint
      class="group rounded-lg bg-promotion p-2 text-primary"
      :title="$t('promotion.confirmation.headline')"
    >
      <template #icon><IconCommercePromotion /></template>
      {{ $t('promotion.confirmation.subline') }}
      <template #trailing>
        <IconNavigationRight
          class="size-3 translate-x-3 opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100"
        />
      </template>
    </SFHint>
  </SFLink>
</template>

<script setup lang="ts">
import SFLink from '@client/components/ui/links/SFLink.vue'
import SFHint from '@client/components/ui/core/SFHint.vue'
import { routes } from '@shared/routes'
import IconCommercePromotion from '@assets/icons/commerce/promotion.svg'
import IconNavigationRight from '@assets/icons/navigation/right.svg'
</script>
