<template>
  <SFSlideIn
    v-model:is-open="isOpen"
    :labelled-by="headingId"
    size="lg"
    data-testid="add-to-basket-slide-in"
  >
    <template #header="{ close }">
      <div class="flex flex-col gap-5">
        <div class="flex items-start justify-between gap-4">
          <p :id="headingId" class="heading-section-1">
            {{ $t('add_to_basket_slide_in.title') }}
          </p>
          <button
            type="button"
            class="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-secondary hover:text-primary"
            data-testid="add-to-basket-slide-in-close"
            :aria-label="$t('global.close')"
            @click="close"
          >
            <IconNavigationClose class="size-3" aria-hidden="true" />
          </button>
        </div>
        <!--
          Desktop keeps the line item and both CTAs in the sticky header so they
          stay in view while the recommendations scroll beneath. On mobile the
          sheet only pins the title and close control, so the summary moves into
          the scrolling body below.
        -->
        <SFAddToBasketSlideInSummary
          v-if="isDesktop && addedItem"
          :item="addedItem"
          class="border-b border-gray-200 pb-6"
        />
      </div>
    </template>

    <div v-if="addedItem" class="flex flex-col gap-6 px-6 pb-6">
      <SFAddToBasketSlideInSummary
        v-if="!isDesktop"
        :item="addedItem"
        class="border-b border-gray-200 pb-6"
      />
      <SFAddToBasketSlideInRecommendations
        v-if="recommendations?.length"
        :key="openCount"
        :products="recommendations"
      />
    </div>
  </SFSlideIn>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/basket
import { computed, onUnmounted, ref, useId, watch } from 'vue'
import { useAddToBasketSlideIn } from '@client/composables/useAddToBasketSlideIn'
import { useDefaultBreakpoints } from '@client/composables/useDefaultBreakpoints'
import { usePage } from '@client/composables/usePage'
import SFSlideIn from '@client/components/ui/core/SFSlideIn.vue'
import IconNavigationClose from '@assets/icons/navigation/close.svg'
import SFAddToBasketSlideInSummary from './SFAddToBasketSlideInSummary.vue'
import SFAddToBasketSlideInRecommendations from './SFAddToBasketSlideInRecommendations.vue'

const { isOpen, addedItem, close: closeSlideIn } = useAddToBasketSlideIn()
const breakpoints = useDefaultBreakpoints()
const headingId = useId()

// The panel is mounted once in the layout, so it reads the recommendations off
// the current page rather than holding its own copy. The product detail page
// already fetches these; every other page sends no `trendingProducts` and the
// section stays hidden. Reading the live page prop is also what keeps the set
// from going stale — it changes with the page, and an add started somewhere
// without trending products of its own cannot show the last page's.
const page = usePage<'ProductDetail'>()
const recommendations = computed(() => page.props.trendingProducts)

const isDesktop = breakpoints.greaterOrEqual('lg')

// The panel stays mounted while closed, and the recommendations report their
// list once per mount. Keying them on the open count remounts them per open,
// so a second add on the same page, or an add on the next page reached through
// a recommendation, reports the list again.
const openCount = ref(0)
watch(isOpen, (open) => {
  if (open) {
    openCount.value++
  }
})

// `isOpen` lives at module scope but the panel does not: navigating to a page on
// `SimpleLayout` tears down the layout that mounts it. Without this reset the
// flag stays `true` with nothing rendering it, and the next `open()` writes a
// value it already holds, so the panel never comes back for the rest of the
// session.
onUnmounted(closeSlideIn)
</script>
