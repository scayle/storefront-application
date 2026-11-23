<template>
  <div
    class="flex flex-col items-center justify-center rounded-sm lg:px-10"
    data-testid="empty-state"
  >
    <div class="flex h-56 w-full justify-center" data-testid="empty-state-icon">
      <IconBasketEmpty
        class="size-56"
        :alt="$t('order_success_page.no_order_found.title')"
      />
    </div>
    <div class="px-14 text-center lg:w-128 lg:px-0">
      <h1 class="block! heading-section-1" data-testid="empty-state-headline">
        {{ $t('order_success_page.no_order_found.title') }}
      </h1>
      <p
        class="mt-4 block! body-large-secondary"
        data-testid="empty-state-subheadline"
      >
        {{ $t('order_success_page.no_order_found.description') }}
      </p>
      <div class="mt-10 flex flex-col justify-center gap-4 lg:flex-row">
        <SFButton
          size="lg"
          :to="routes.home"
          variant="secondary"
          data-testid="button-continue-shopping"
        >
          {{ $t('common.continue_shopping') }}
        </SFButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { routes } from '@shared/routes'
import IconBasketEmpty from '@assets/icons/empty/basket.svg'
import SFButton from '../ui/core/SFButton.vue'
</script>
