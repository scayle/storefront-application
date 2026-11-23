<template>
  <ClientOnly>
    <template v-if="timeUntil" #fallback>
      <SFCountdownSkeleton
        :data-amplience-entry-id="contentElement._meta?.deliveryId"
        data-amplience-field-id="end_date"
        v-bind="$attrs"
        :size="isLarge ? 'large' : 'small'"
        :time-until="timeUntil"
      />
    </template>
    <SFCountdownLarge
      v-if="isLarge && timeUntil"
      :data-amplience-entry-id="contentElement._meta?.deliveryId"
      data-amplience-field-id="end_date"
      v-bind="$attrs"
      :time-until="timeUntil"
    />
    <SFCountdownSmall
      v-else-if="timeUntil"
      :data-amplience-entry-id="contentElement._meta?.deliveryId"
      data-amplience-field-id="end_date"
      v-bind="$attrs"
      :time-until="timeUntil"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFCountdownSmall from '@client/components/ui/core/SFCountdownSmall.vue'
import SFCountdownLarge from '@client/components/ui/core/SFCountdownLarge.vue'
import SFCountdownSkeleton from '@client/components/ui/core/SFCountdownSkeleton.vue'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import type { CountdownTimerComponent as CountdownTimerComponentType } from '@shared/types/cms/amplience'

const { contentElement } = defineProps<{
  contentElement: CountdownTimerComponentType
}>()

const timeUntil = computed(() => contentElement.end_date)

/** Large is opt-in; any other value (incl. the default) renders the small variant. */
const isLarge = computed(() => contentElement.size === 'large')
</script>
