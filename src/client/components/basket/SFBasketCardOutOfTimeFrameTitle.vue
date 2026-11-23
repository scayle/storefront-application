<template>
  <div
    class="mt-1 flex items-center space-x-2 rounded-md bg-status-warning/10 px-3 py-1.5 text-sm/4 text-primary lg:mt-0.5"
    data-testid="basket-card-out-of-time-frame-title"
  >
    <IconAvailabilitySoldout class="size-4" />
    <SFHint v-if="timeframe.state === 'future'" tag="span">
      {{ t('product_detail.sellable_in_future') }}
    </SFHint>
    <SFHint v-else-if="timeframe.state === 'past'" tag="span">
      {{ t('product_detail.sellable_in_past') }}
    </SFHint>
  </div>
</template>

<script setup lang="ts">
import type { SellableTimeframe } from '@scayle/storefront/types'
import SFHint from '@client/components/ui/core/SFHint.vue'
import IconAvailabilitySoldout from '@assets/icons/availability/soldout.svg'
import { useI18n } from 'vue-i18n'

defineProps<{
  timeframe: SellableTimeframe
}>()

const { t } = useI18n()
</script>
