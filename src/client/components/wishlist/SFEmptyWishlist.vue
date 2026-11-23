<template>
  <div
    class="flex flex-col items-center justify-center rounded-sm lg:px-10"
    data-testid="wishlist-empty-state"
  >
    <div class="flex h-56 w-full justify-center" data-testid="empty-state-icon">
      <IconBasketEmpty class="size-56" aria-hidden="true" />
    </div>
    <div class="px-14 text-center lg:w-128 lg:px-0">
      <h1
        class="block! heading-section-1"
        data-testid="wishlist-empty-headline"
      >
        {{ $t('wishlist_page.empty_title') }}
      </h1>
      <p
        class="mt-4 block! body-large-secondary"
        data-testid="wishlist-empty-description"
      >
        {{ $t('wishlist_page.empty_description') }}
      </p>
      <div
        class="mt-10 flex flex-col justify-center gap-4 lg:flex-row"
        role="group"
        :aria-label="$t('wishlist_page.a11y.empty_actions')"
      >
        <Deferred data="customer">
          <template #fallback>
            <SFButton
              size="lg"
              :to="routes.home"
              variant="plain"
              data-testid="wishlist-continue-shopping-fallback"
            >
              {{ $t('common.continue_shopping') }}
            </SFButton>
          </template>

          <template v-if="!page.props.customer">
            <SFButton
              size="lg"
              :to="
                getSignInRoute(
                  localizeLink(page.props.storefront, routes.wishlist),
                )
              "
              data-testid="wishlist-signin"
            >
              {{ $t('common.sign_in') }}
            </SFButton>
          </template>

          <SFButton
            size="lg"
            :to="routes.home"
            variant="secondary"
            data-testid="wishlist-continue-shopping"
          >
            {{ $t('common.continue_shopping') }}
          </SFButton>
        </Deferred>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Deferred } from '@inertiajs/vue3'
import { usePage } from '@client/composables/usePage'
import { localizeLink } from '@scayle/storefront/shared'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { getSignInRoute, routes } from '@shared/routes'
import IconBasketEmpty from '@assets/icons/empty/basket.svg'

const page = usePage()
</script>
