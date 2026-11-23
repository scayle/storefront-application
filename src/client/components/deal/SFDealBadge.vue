<template>
  <div
    class="w-min max-w-full truncate rounded-sm px-2 py-1.5 text-sm leading-none"
    :style="style"
  >
    {{ text }}
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'

const {
  text,
  style = {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-white)',
  },
} = defineProps<{
  text: string
  style?: Pick<CSSProperties, 'backgroundColor' | 'color'>
}>()
</script>
