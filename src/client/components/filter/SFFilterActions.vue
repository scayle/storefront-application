<template>
  <div class="flex gap-2">
    <SFButton
      data-testid="reset-filter-button"
      variant="secondary"
      size="lg"
      class="w-1/2"
      @click="$emit('reset')"
    >
      {{ $t('filter_actions.reset_all_filter') }}
    </SFButton>
    <SFButton
      data-testid="apply-filter-button"
      :form="formId"
      type="submit"
      size="lg"
      class="w-1/2"
    >
      {{ showResultsLabel }}
    </SFButton>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { useI18n } from 'vue-i18n'
import {
  useAnnouncer,
  ANNOUNCE_DEBOUNCE_MS,
} from '@client/composables/useAnnouncer'

const { filteredProductCount } = defineProps<{
  /** Number of products matching the current filter selection. Shown on the apply button. */
  filteredProductCount: number
  /**
   * Id of the `<form>` rendered around the slide-in body. Lets the apply
   * button submit the surrounding form despite living in the slide-in's
   * `#footer` slot (HTML's `form` attribute reaches across the DOM).
   */
  formId?: string
}>()

const { t } = useI18n()
const { announce } = useAnnouncer()

defineEmits<{
  /** Emitted when the user clicks "Reset all filters". */
  reset: []
}>()

const showResultsLabel = computed(() => {
  return filteredProductCount
    ? t('filter_actions.show_results_with_count', filteredProductCount)
    : t('filter_actions.show_results')
})

// Announces the product-count change after a filter toggle, routed through
// the shared polite live region. Debounced (`ANNOUNCE_DEBOUNCE_MS`) so fast
// toggles produce a single announcement once the dust settles, instead of one
// per keystroke.
watch(
  () => filteredProductCount,
  (next, prev) => {
    if (prev === undefined) {
      // Initial render — no delta to announce.
      return
    }
    announce(t('filter_actions.show_results_with_count', next), {
      debounce: ANNOUNCE_DEBOUNCE_MS,
    })
  },
)
</script>
