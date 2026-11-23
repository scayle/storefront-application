<template>
  <div>
    <slot :paginated-items="paginatedItems" />
    <div
      v-if="pagination.hasMultiplePages"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{
        $t('pagination.a11y.page_status', {
          current: currentPage,
          total: pagination.lastPage?.page,
        })
      }}
    </div>
    <SFPagination
      v-if="pagination.hasMultiplePages"
      :pagination="pagination"
      navigate-by="button"
      :aria-label="$t('pagination.a11y.label')"
      class="mt-10"
      data-testid="client-pagination"
      @page-change="goToPage"
    />
  </div>
</template>

<script setup lang="ts" generic="T">
import { useClientPagination } from '@client/composables/useClientPagination'
import SFPagination from './SFPagination.vue'

const props = defineProps<{
  /** All items to paginate. */
  items: T[]
  /** Number of items to display per page. */
  itemsPerPage: number
}>()

const { pagination, paginatedItems, goToPage, currentPage } =
  useClientPagination(
    () => props.items,
    () => props.itemsPerPage,
  )

defineSlots<{
  /** Scoped slot receiving the current page's items. */
  default: (props: { paginatedItems: T[] }) => unknown
}>()
</script>
