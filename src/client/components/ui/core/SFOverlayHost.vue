<template>
  <template v-for="entry in mountedEntries" :key="entry.id">
    <component
      :is="entry.component"
      :id="entry.id"
      v-bind="entry.props()"
      :open="entry.isOpen"
      @update:open="(open: boolean) => !open && entry.close()"
      @close="entry.close()"
    />
  </template>
</template>

<script setup lang="ts">
/**
 * Renders the overlays created through `useOverlay()` that have been opened at
 * least once.
 *
 * Rendered once per app, next to the Inertia `App` in `main.ts` and `ssr.ts`,
 * so an overlay outlives a switch between layouts. Overlays open only from user
 * input, so the server render of this component is always empty.
 */
import { computed, inject } from 'vue'
import { OVERLAY_INJECTION_KEY } from '@client/plugins/overlay'

const registry = inject(OVERLAY_INJECTION_KEY)

const mountedEntries = computed(
  () => registry?.entries.filter((entry) => entry.component) ?? [],
)
</script>
