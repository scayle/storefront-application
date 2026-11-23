<template>
  <h1
    class="flex w-full items-baseline gap-1 heading-section-1 lg:max-w-160"
    data-testid="headline"
  >
    {{ $t('basket_page.title') }}
    <SFHeadlineItemCount :count="count" />
  </h1>
</template>

<script setup lang="ts">
import SFHeadlineItemCount from '@client/components/ui/core/SFHeadlineItemCount.vue'

defineProps<{
  /** Number of items in the basket, rendered as “(N items)” next to the title. */
  count: number
}>()
</script>
