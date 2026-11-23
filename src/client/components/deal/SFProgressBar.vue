<template>
  <div class="relative has-[div]:pb-10">
    <progress
      class="block h-1.5 w-full rounded-full border"
      :class="PROGRESS_FILL"
      max="100"
      :value="progress"
      :aria-label="ariaLabel"
      :style="progressBarStyle"
    />
    <div
      v-for="({ percent, title, subtitle }, index) in milestones"
      :key="percent"
      class="absolute top-[-5px] flex w-14 flex-col items-center overflow-hidden text-primary last:items-end"
      :style="{
        left: `calc(${percent * 100}% - ${
          index + 1 === milestones?.length ? '56px' : '28px'
        })`,
      }"
    >
      <div
        class="mb-2 flex h-4 w-1 items-center border bg-primary"
        :style="{ background: backgroundColor(percent), 'border-color': color }"
      >
        <div
          class="size-1 bg-white"
          :class="percent === 1 ? '-mx-0.5' : '-mx-px'"
          :style="{ background: backgroundColor(percent) }"
        ></div>
      </div>
      <div class="truncate overflow-hidden text-sm font-bold">{{ title }}</div>
      <div class="truncate overflow-hidden text-sm">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ProgressMilestone {
  percent: number
  title: string
  subtitle: string
}

const {
  color = 'var(--color-primary)',
  progress,
  ariaLabel,
} = defineProps<{
  progress: number
  /** Accessible name of the progress bar, for example the text that explains the next milestone. */
  ariaLabel?: string
  color?: string
  milestones?: ProgressMilestone[]
}>()

/**
 * Fill and track styling for the native `<progress>` pseudo-elements, which the `style`
 * attribute cannot target. The fill color reads `--progress-color`, set inline below —
 * custom properties inherit into pseudo-elements, so a runtime color still reaches them.
 * Kept out of the template because the variant-heavy list is unreadable inline.
 */
const PROGRESS_FILL = [
  '[&::-webkit-progress-bar]:bg-white',
  '[&::-webkit-progress-value]:bg-(--progress-color)',
  '[&::-webkit-progress-value]:transition-[width]',
  '[&::-webkit-progress-value]:duration-300',
  '[&::-webkit-progress-value]:ease-in-out',
  '[&::-moz-progress-bar]:bg-(--progress-color)',
  '[&::-moz-progress-bar]:transition-[width]',
  '[&::-moz-progress-bar]:duration-300',
  '[&::-moz-progress-bar]:ease-in-out',
].join(' ')

const progressBarStyle = computed(() => {
  return {
    backgroundColor: 'var(--color-white)',
    borderColor: color,
    '--progress-color': color,
  }
})

const backgroundColor = (percent: number) => {
  return progress >= percent * 100 ? color : 'var(--color-white)'
}
</script>
