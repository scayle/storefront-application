<template>
  <span
    v-if="count !== undefined"
    class="body-default lg:text-xl"
    data-testid="headline-item-count"
    aria-hidden="true"
  >
    ({{ t('navigation.breadcrumb.item_count', count) }})
  </span>
  <!-- Pluralized count for assistive tech, so the headline reads "Title, N items". -->
  <span v-if="count !== undefined" class="sr-only">
    {{ t('navigation.breadcrumb.item_count', count) }}
  </span>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Two-root template (the visible count plus its `sr-only` sibling). With no
 * single root to receive them, fallthrough attributes are intentionally
 * dropped rather than duplicated onto both spans — callers style the suffix via
 * the parent headline.
 */
defineOptions({ inheritAttrs: false })
// Consume `$attrs` explicitly to satisfy the custom
// `require-explicit-fallthrough-attrs` lint rule for multi-root components. The
// value is deliberately discarded (see above); `inheritAttrs: false` already
// stops the attributes from being auto-applied.
useAttrs()

const { count } = defineProps<{
  /**
   * Item count rendered as “(N items)” alongside a page headline. Omitted
   * (left `undefined`) while deferred listing data is still loading, so the
   * suffix is not shown until the real count resolves.
   */
  count?: number
}>()

const { t } = useI18n()
</script>
