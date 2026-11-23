<template>
  <nav class="-ml-2" :aria-label="ariaLabel ?? t('navigation.a11y.breadcrumb')">
    <ol class="flex flex-wrap items-center gap-1">
      <li
        v-for="(item, index) in displayItems"
        :key="`${index}-${item.value}`"
        class="inline-flex items-center gap-1"
      >
        <template
          v-if="
            item.to && !(lastAsCurrent && index === displayItems.length - 1)
          "
        >
          <SFButton
            variant="plain"
            :to="item.to"
            :data-testid="`breadcrumb-item-${index}`"
            class="font-normal! lg:text-lg"
          >
            <span class="truncate" :title="item.value">{{ item.value }}</span>
          </SFButton>
        </template>
        <span
          v-else
          :data-testid="`breadcrumb-item-${index}`"
          :class="[
            lastAsCurrent && index === displayItems.length - 1
              ? currentClass
              : itemBaseClass,
            itemClass,
          ]"
          :aria-current="
            lastAsCurrent && index === displayItems.length - 1
              ? 'page'
              : undefined
          "
        >
          <span class="truncate" :title="item.value">{{ item.value }}</span>
          <span
            v-if="
              lastAsCurrent && index === displayItems.length - 1 && item.meta
            "
            class="font-normal text-secondary"
            data-testid="breadcrumb-current-meta"
          >
            ({{ item.meta }})
          </span>
        </span>
        <IconChevronRight
          v-if="index < displayItems.length - 1"
          aria-hidden="true"
          data-testid="breadcrumb-separator"
          class="size-2 shrink-0 text-secondary"
        />
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconChevronRight from '@assets/icons/navigation/right.svg'
import SFButton from '../core/SFButton.vue'

/**
 * Single entry rendered in {@link SFBreadcrumb}.
 *
 * Compatible with the shared `BreadcrumbItem` type (`to: string`), while
 * additionally accepting items without a target — used internally for the
 * ellipsis (`…`) entry and for the current page when `lastAsCurrent` is set.
 */
export interface SFBreadcrumbItem {
  /** Display text shown in the entry. */
  value: string
  /** Navigation target. Omit to render the entry as non-interactive text. */
  to?: string
  /**
   * Optional secondary text appended to the entry in parentheses with a
   * lighter weight/color. Only rendered on the current crumb when
   * {@link SFBreadcrumb} is used with `lastAsCurrent`.
   */
  meta?: string
}

const {
  items,
  lastAsCurrent = false,
  maxItems = 4,
  ariaLabel,
} = defineProps<{
  /** Ordered breadcrumb trail, root first. */
  items: SFBreadcrumbItem[]
  /**
   * When true, the last item renders as the current page: non-interactive
   * `<span>` with `aria-current="page"` and emphasized weight. Matches Figma
   * "Last item as current" variant.
   */
  lastAsCurrent?: boolean
  /**
   * Maximum number of items rendered before the middle is collapsed into a
   * single ellipsis (`…`) entry. The first and last items are always kept.
   * Set to `0` or a value `>= items.length` to disable truncation.
   */
  maxItems?: number
  /** Optional override for the `nav` landmark label. */
  ariaLabel?: string
}>()

const { t } = useI18n()

/**
 * Resolved trail with optional ellipsis collapse. Keeps the first item and
 * the last `maxItems - 2` items, replacing the gap with one synthetic entry.
 */
const displayItems = computed<SFBreadcrumbItem[]>(() => {
  if (maxItems <= 0 || items.length <= maxItems) {
    return items
  }
  const tailCount = Math.max(1, maxItems - 2)
  // `items.length > maxItems > 0` here, so the first item exists.
  return [items[0]!, { value: '…' }, ...items.slice(items.length - tailCount)]
})

const itemClass =
  'h-5 px-1.5 text-lg font-normal lg:h-6 lg:text-lg lg:font-semibold'
const itemBaseClass =
  'inline-flex items-center text-secondary hover:text-primary transition-colors hover:bg-gray-200 rounded-sm'
const currentClass =
  'inline-flex items-center gap-1 text-secondary lg:text-primary cursor-default bg-gray-200 rounded-sm'
</script>
