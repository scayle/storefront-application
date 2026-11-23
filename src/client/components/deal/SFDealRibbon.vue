<template>
  <div
    v-if="visible"
    ref="root"
    :style="deal.color"
    data-testid="promotion-ribbon"
  >
    <div
      class="container flex justify-between px-4 py-2 lg:justify-around lg:px-7"
    >
      <component
        :is="component"
        v-bind="attributes"
        class="flex w-full items-center justify-center space-x-4"
      >
        <div class="flex flex-col space-x-1 lg:flex-row">
          <span
            class="text-md font-semibold lg:pr-1"
            data-testid="promotion-ribbon-headline"
            >{{ deal.headline }}</span
          >
          <template v-if="deal.subline">
            <span
              class="content-center text-sm leading-none font-normal max-lg:hidden lg:text-md"
              >·</span
            >
            <span
              class="content-center text-sm leading-none font-normal max-lg:hidden lg:text-md"
              data-testid="promotion-ribbon-subheadline"
              :style="{ borderColor: deal.color.color }"
            >
              {{ deal.subline }}
            </span>
          </template>
        </div>
        <template v-if="!deal.hideCountdown && deal.schedule.to">
          <ClientOnly>
            <template #fallback>
              <SFCountdownSkeleton
                size="small"
                :time-until="deal.schedule.to"
              />
            </template>
            <SFCountdownSmall
              class="border-transparent!"
              :time-until="deal.schedule.to"
              data-testid="promotion-ribbon-timer"
              :style="{
                backgroundColor: `rgb(from contrast-color(${deal.color.backgroundColor}) r g b / 0.1) !important`,
                color: deal.color.color,
              }"
            />
          </ClientOnly>
        </template>
      </component>
      <button
        class="size-7 rounded-lg p-2 hover:bg-gray-200/30"
        :aria-label="$t('global.close')"
        @click="closeRibbon"
      >
        <CloseIcon class="size-full" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useVisibilityTracking } from '@client/composables/useVisibilityTracking'
import SFLink from '@client/components/ui/links/SFLink.vue'
import { useDealTracking } from '@client/composables/tracking/useDealTracking'
import CloseIcon from '@client/assets/icons/navigation/close.svg'
import type { Campaign, Promotion } from '@scayle/storefront/types'
import ClientOnly from '../ui/core/ClientOnly.vue'
import SFCountdownSkeleton from '../ui/core/SFCountdownSkeleton.vue'
import SFCountdownSmall from '../ui/core/SFCountdownSmall.vue'

const { deal } = defineProps<{
  /**
   * The deal to display.
   */
  deal: Promotion | Campaign
}>()

const visible = ref(true)
const closeRibbon = () => {
  visible.value = false
}

const component = computed(() => {
  return deal.link ? SFLink : 'div'
})

// The layout renders one ribbon at a time, so it is always the first of one.
const { onVisible, onSelect } = useDealTracking(
  () => deal,
  () => ({ component_type: 'ribbon', position: 1, total: 1 }),
)

const attributes = computed(() => {
  if (!deal.link) {
    return {}
  }
  return {
    raw: true,
    to: deal.link,
    'aria-label': deal.subline
      ? `${deal.headline} · ${deal.subline}`
      : deal.headline,
    onClick: onSelect,
  }
})
const root = useTemplateRef('root')
useVisibilityTracking(root, onVisible)
</script>
