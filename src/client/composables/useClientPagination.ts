import { ref, computed } from 'vue'
import type { ComputedRef, Ref, MaybeRefOrGetter } from 'vue'
import { toRef, useEventListener, useMediaQuery } from '@vueuse/core'
import { buildPagination } from '@scayle/storefront/shared'
import type { Pagination } from '@scayle/storefront/types'
import { VISIBLE_PAGE_COUNT } from '@shared/constants/pagination'
import { clamp } from '@client/utils/math'
import { useRoute } from './useRoute'

/**
 * Return shape of `useClientPagination`: reactive pagination state, sliced items, and navigation.
 */
export interface UseClientPaginationReturn<T> {
  /** Pagination UI model for `SFPagination`. */
  pagination: ComputedRef<Pagination>
  /** Items for the current page. */
  paginatedItems: ComputedRef<T[]>
  /**
   * Navigates to a page by updating the reactive state and the browser URL.
   * Uses `history.pushState` to avoid triggering an Inertia server visit.
   *
   * @param page - 1-based page number to navigate to.
   */
  goToPage: (page: number) => void
  /** Current 1-based page number. */
  currentPage: Ref<number>
}

/**
 * Provides client-side pagination for an in-memory array of items.
 *
 * Manages page state via URL query params (`?page=N`) using `history.pushState`,
 * syncs on browser back/forward, and clamps the page number to valid bounds.
 * Returns `Pagination` that can be passed directly to `SFPagination`.
 *
 * @param _items - All items to paginate.
 * @param _itemsPerPage - Number of items per page.
 * @returns Reactive pagination state, the current page slice, and a navigation function.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const props = defineProps<{ orders: Order[] }>()
 * const { pagination, paginatedItems, goToPage } = useClientPagination(
 *   () => props.orders,
 *   () => 8,
 * )
 * </script>
 * ```
 */
export function useClientPagination<T>(
  _items: MaybeRefOrGetter<T[]>,
  _itemsPerPage: MaybeRefOrGetter<number>,
): UseClientPaginationReturn<T> {
  const items = toRef(_items)
  const itemsPerPage = toRef(_itemsPerPage)
  const { query } = useRoute()

  const totalPageCount = computed(() =>
    Math.max(1, Math.ceil(items.value.length / itemsPerPage.value)),
  )

  /** Clamps a value between 1 and `totalPageCount`. */
  function clampPage(page: number): number {
    return clamp(page, 1, totalPageCount.value)
  }

  function parsePage(raw: string | null | undefined): number {
    const trimmed = raw?.trim()
    if (!trimmed) {
      return 1
    }
    const parsed = Number(trimmed)
    return Number.isNaN(parsed) ? 1 : parsed
  }

  const currentPage = ref(parsePage(query.value.get('page')))

  const isCurrentPageValid = computed(
    () =>
      Number.isInteger(currentPage.value) &&
      currentPage.value >= 1 &&
      currentPage.value <= totalPageCount.value,
  )

  const pagination = computed(() =>
    buildPagination({
      totalItems: items.value.length,
      itemsPerPage: itemsPerPage.value,
      currentPage: currentPage.value,
      totalPageCount: totalPageCount.value,
      visiblePageCount: VISIBLE_PAGE_COUNT,
    }),
  )

  /** The slice of items visible on the current page; empty for invalid pages. */
  const paginatedItems = computed<T[]>(() => {
    if (!isCurrentPageValid.value) {
      return []
    }
    const start = (currentPage.value - 1) * itemsPerPage.value
    return items.value.slice(start, start + itemsPerPage.value)
  })

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  function goToPage(page: number) {
    const clamped = clampPage(page)
    currentPage.value = clamped

    const url = new URL(window.location.href)
    if (clamped === 1) {
      url.searchParams.delete('page')
    } else {
      url.searchParams.set('page', String(clamped))
    }
    window.history.pushState({}, '', url.toString())

    window.scroll({
      behavior: prefersReducedMotion.value ? 'instant' : 'smooth',
      top: 0,
    })
  }

  /**
   * Syncs `currentPage` on browser back/forward.
   * Inertia's `usePage().url` does not react to `history.pushState`,
   * so we read from `window.location` directly on popstate.
   * Kept unclamped so an out-of-range page in the URL still triggers
   * the empty-state branch in `paginatedItems`.
   */
  useEventListener('popstate', () => {
    const param = new URL(window.location.href).searchParams.get('page')
    currentPage.value = parsePage(param)
  })

  return { pagination, paginatedItems, goToPage, currentPage }
}
