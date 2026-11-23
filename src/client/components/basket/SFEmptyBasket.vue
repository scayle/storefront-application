<template>
  <div
    class="flex flex-col items-center justify-center rounded-sm lg:px-10"
    data-testid="empty-state"
  >
    <div class="flex h-56 w-full justify-center" data-testid="empty-state-icon">
      <IconBasketEmpty
        class="size-56"
        :alt="$t('basket_page.empty_basket_title')"
      />
    </div>
    <div class="px-14 text-center lg:w-128 lg:px-0">
      <h1 class="block! heading-section-1" data-testid="empty-state-headline">
        {{ $t('basket_page.empty_basket_title') }}
      </h1>
      <p
        class="mt-4 block! body-large-secondary"
        data-testid="empty-state-subheadline"
      >
        {{ $t('basket_page.empty_basket_description') }}
      </p>
      <div class="mt-10 flex flex-col justify-center gap-4 lg:flex-row">
        <Deferred data="customer">
          <template #fallback />

          <SFButton
            v-if="!page.props.customer"
            size="lg"
            :to="
              getSignInRoute(localizeLink(page.props.storefront, routes.basket))
            "
            data-testid="button-signin"
          >
            {{ $t('common.sign_in') }}
          </SFButton>
        </Deferred>

        <SFButton
          size="lg"
          :to="routes.home"
          variant="secondary"
          data-testid="button-continue-shopping"
        >
          {{ $t('common.continue_shopping') }}
        </SFButton>
      </div>
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Deferred } from '@inertiajs/vue3'
import { usePage } from '@client/composables/usePage'
import { localizeLink } from '@scayle/storefront/shared'
import IconBasketEmpty from '@assets/icons/empty/basket.svg'
import { getSignInRoute, routes } from '@shared/routes'
import SFButton from '../ui/core/SFButton.vue'

const page = usePage()
</script>
