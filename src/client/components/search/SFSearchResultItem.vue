<template>
  <SFLink
    :id="id"
    :to="to"
    raw
    tabindex="-1"
    :data-selected="isActive || undefined"
    class="block cursor-pointer space-y-2 rounded-lg border border-secondary p-4 hover:border-primary hover:bg-gray-200 focus:border-primary focus:bg-gray-200 data-selected:border-primary data-selected:bg-gray-200"
    data-testid="search-suggestions-item"
  >
    <slot />
  </SFLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFLink from '@client/components/ui/links/SFLink.vue'

const { to, id, activeId } = defineProps<{
  /** Target URL for the search result item. */
  to: string
  /** Unique ID for aria-activedescendant matching. */
  id: string
  /** Currently active suggestion ID from keyboard navigation. */
  activeId?: string
}>()

const isActive = computed(() => id === activeId)
</script>
