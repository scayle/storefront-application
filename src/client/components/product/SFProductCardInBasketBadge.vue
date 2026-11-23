<template>
  <div
    v-if="inBasket && !isBasketPage"
    class="w-fit self-end rounded-tl-md bg-secondary px-2 py-0.5 text-sm font-normal text-gray-200"
    v-bind="$attrs"
  >
    {{ t('badge_labels.already_in_basket') }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMounted } from '@vueuse/core'
import { useBasket } from '@client/composables/useBasket'
import { useIsPage } from '@client/composables/usePageComponent'

const { productId } = defineProps<{
  productId: number
}>()

const { t } = useI18n()
const { hasProductInBasket } = useBasket()

const isMounted = useMounted()

// The prop:
//   `basket` is a deferred Inertia shared prop (group `customer-data`), so it is
//   absent during SSR. The server therefore always renders no badge.
//
// The problem:
//   Inside a `<Suspense>` subtree (e.g. the async CMS product sliders), client
//   hydration is postponed until the deferred prop has resolved. So by the time
//   this component first renders on the client, `basket` is already present —
//   reading it directly would render the badge and disagree with the empty
//   server HTML, causing a hydration mismatch.
//
// The fix:
//   Gate on `isMounted` so the initial client render matches SSR (no badge),
//   then reveal the badge on the next tick once mounted.
const inBasket = computed(
  () => isMounted.value && hasProductInBasket(productId),
)

// Use page component name (set by server when rendering) instead of parsing the URL.
// Page identity comes from the server and view only consumes it.
const { isActive: isBasketPage } = useIsPage('Basket')
</script>
