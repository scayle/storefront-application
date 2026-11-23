<template>
  <SFButton
    class="aria-busy:animate-pulse aria-busy:cursor-progress motion-reduce:aria-busy:opacity-50 max-lg:h-11 max-lg:w-full max-lg:justify-start max-lg:pl-4 lg:w-min lg:flex-row-reverse"
    data-testid="filter-toggle-button"
    size="sm"
    variant="secondary"
    aria-haspopup="dialog"
    :aria-label="accessibleName"
    @click="$emit('toggle')"
  >
    <template #prepend-icon>
      <IconUtilityFilter class="fill-primary lg:size-3!" />
    </template>

    <span
      class="flex items-center gap-2 text-lg max-lg:flex-1 max-lg:text-left lg:text-md"
    >
      <span class="text-primary">
        {{ label }}
      </span>
      <SFCountBadge
        :count="appliedFiltersCount"
        aria-hidden="true"
        data-testid="filter-toggle-counter"
      />
    </span>
  </SFButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFCountBadge from '@client/components/ui/core/SFCountBadge.vue'
import IconUtilityFilter from '@assets/icons/utility/filter.svg'

// `aria-expanded`, `aria-controls` and `aria-busy` come from the filter
// overlay's `triggerAttrs`, which the page binds on this component.
const { label, appliedFiltersCount } = defineProps<{
  /** Button label text displayed next to the filter icon. */
  label: string
  /** Number of currently active filters, shown as a badge on the button. */
  appliedFiltersCount: number
}>()

defineEmits<{
  /** Emitted when the user clicks the button to open or close the filter panel. */
  toggle: []
}>()

const { t } = useI18n()

/**
 * Accessible name. When filters are active the count is folded into the name
 * (the visible badge is `aria-hidden`, so the number isn't announced twice).
 * When zero, no override — the visible button text serves as the name.
 */
const accessibleName = computed(() =>
  appliedFiltersCount > 0
    ? t('filter.a11y.toggle_with_count', {
        label,
        count: appliedFiltersCount,
      })
    : undefined,
)
</script>
