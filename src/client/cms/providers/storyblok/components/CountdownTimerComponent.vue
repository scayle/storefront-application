<template>
  <ClientOnly>
    <template v-if="timeUntil" #fallback>
      <SFCountdownSkeleton
        v-editable="contentElement"
        v-bind="$attrs"
        :size="isLarge ? 'large' : 'small'"
        :time-until="timeUntil"
      />
    </template>
    <SFCountdownLarge
      v-if="isLarge && timeUntil"
      v-editable="contentElement"
      :time-until="timeUntil"
      v-bind="$attrs"
    />
    <SFCountdownSmall
      v-else-if="timeUntil"
      v-editable="contentElement"
      :time-until="timeUntil"
      v-bind="$attrs"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFCountdownSmall from '@client/components/ui/core/SFCountdownSmall.vue'
import SFCountdownLarge from '@client/components/ui/core/SFCountdownLarge.vue'
import SFCountdownSkeleton from '@client/components/ui/core/SFCountdownSkeleton.vue'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import type { CountdownTimerComponent } from '@shared/types/cms/storyblok'

const { contentElement } = defineProps<{
  contentElement: CountdownTimerComponent
}>()

const timeUntil = computed(() => contentElement.endDate)

/** Large is opt-in; any other value (incl. the default) renders the small variant. */
const isLarge = computed(() => contentElement.size === 'large')
</script>
