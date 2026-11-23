<template>
  <div
    class="flex flex-col items-center justify-center"
    data-testid="empty-state"
  >
    <div class="flex h-56 w-full justify-center" data-testid="empty-state-icon">
      <IconBasketEmpty
        class="size-56"
        :alt="$t('account.orders.empty_state.title')"
      />
    </div>
    <h2 class="heading-section-1" data-testid="headline-no-orders">
      {{ $t('account.orders.empty_state.title') }}
    </h2>
    <p class="mt-4 body-large-secondary" data-testid="description-no-orders">
      {{ $t('account.orders.empty_state.description') }}
    </p>
    <SFButton
      size="lg"
      variant="secondary"
      class="mt-10"
      data-testid="button-continue-shopping"
      @click="navigate(routes.home)"
    >
      {{ $t('common.continue_shopping') }}
    </SFButton>
  </div>
</template>

<script setup lang="ts">
import IconBasketEmpty from '@assets/icons/empty/basket.svg'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { useRoute } from '@client/composables/useRoute'
import { routes } from '@shared/routes'

const { navigate } = useRoute()
</script>
