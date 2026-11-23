<template>
  <div class="flex flex-col gap-4 px-6 py-7 lg:py-4">
    <fieldset
      v-if="hasHeader"
      class="m-0 grid grid-cols-[1fr_auto] items-center gap-4 border-0 p-0"
    >
      <legend class="contents">
        <span
          class="col-start-1 inline-flex items-center gap-1 p-0 heading-section-2 leading-normal"
        >
          <slot name="label">
            <span v-if="label">{{ label }}</span>
            <SFCountBadge :count="badge" data-testid="filter-group-counter" />
          </slot>
        </span>
      </legend>
      <div class="col-start-2 justify-self-end">
        <slot name="action">
          <SFButton
            v-if="badge > 0 || showAction"
            size="sm"
            variant="plain"
            class="border-none"
            @click="$emit('clickReset')"
          >
            {{ resetLabel ?? $t('filter_group.reset') }}
          </SFButton>
        </slot>
      </div>
      <div class="col-span-2">
        <slot />
      </div>
    </fieldset>
    <template v-else>
      <slot />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFCountBadge from '@client/components/ui/core/SFCountBadge.vue'

const {
  resetLabel,
  label = '',
  badge = 0,
  showAction = false,
} = defineProps<{
  /** Display label for the filter group header. If omitted, the header is hidden. */
  label?: string
  /** Custom label for the reset button. Defaults to the `filter_group.reset` translation key. */
  resetLabel?: string
  /** Number of active selections in this group, shown as a badge on the header. */
  badge?: number
  /** Forces the reset button to appear even when `badge` is 0. Defaults to `false`. */
  showAction?: boolean
}>()

defineEmits<{
  /** Emitted when the user clicks the reset button to clear all selections in this group. */
  clickReset: []
}>()

const slots = useSlots()
const hasHeader = computed(() => Boolean(label || slots.label))
</script>
