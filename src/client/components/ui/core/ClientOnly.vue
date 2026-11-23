<template>
  <template v-if="isMounted">
    <slot />
  </template>
  <template v-else-if="$slots.fallback">
    <slot name="fallback" />
  </template>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

/**
 * Renders slot content only on the client after mount.
 * Use for content that must not run during SSR (e.g. transitions, browser APIs).
 * Optional "fallback" slot can be used for SSR placeholder.
 */
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})
</script>
