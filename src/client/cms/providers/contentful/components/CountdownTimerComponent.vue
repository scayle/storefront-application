<template>
  <ClientOnly>
    <template v-if="timeUntil" #fallback>
      <SFCountdownSkeleton
        :data-contentful-entry-id="contentElement?.sys?.id"
        data-contentful-field-id="endDate"
        v-bind="$attrs"
        :size="isLarge ? 'large' : 'small'"
        :time-until="timeUntil"
      />
    </template>
    <SFCountdownLarge
      v-if="isLarge && timeUntil"
      :data-contentful-entry-id="contentElement?.sys?.id"
      data-contentful-field-id="endDate"
      v-bind="$attrs"
      :time-until="timeUntil"
    />
    <SFCountdownSmall
      v-else-if="timeUntil"
      :data-contentful-entry-id="contentElement?.sys?.id"
      data-contentful-field-id="endDate"
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
import type { TypeCountdownTimerComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'

const { contentElement } = defineProps<{
  contentElement: TypeCountdownTimerComponentWithoutUnresolvableLinksResponse
}>()

const timeUntil = computed(() => contentElement.fields?.endDate)

/** Large is opt-in; any other value (incl. the default) renders the small variant. */
const isLarge = computed(() => contentElement.fields?.size === 'large')
</script>
