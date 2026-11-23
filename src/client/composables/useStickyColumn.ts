import { computed, nextTick, ref, toValue } from 'vue'
import type { ComputedRef, CSSProperties, MaybeRefOrGetter } from 'vue'
import { tryOnMounted, useResizeObserver, useWindowSize } from '@vueuse/core'
import { useDefaultBreakpoints } from '@client/composables/useDefaultBreakpoints'

/** Gap in pixels kept between a pinned column and the viewport edge (`2rem`). */
const DEFAULT_GAP_PX = 32

/**
 * Computes the `top` offset that makes a column pin against whichever of its
 * siblings is taller, for side-by-side columns of unequal height.
 *
 * A column shorter than the viewport pins at `gap` below the top edge, the
 * familiar sticky-sidebar behavior. A column taller than the viewport instead
 * gets a *negative* offset, so it scrolls with the page until its bottom edge
 * reaches `gap` above the viewport bottom and pins only from there: the reader
 * sees all of it before it stops moving.
 *
 * Apply it to every column of the row. A column as tall as the row has no room
 * to travel within its grid area, so its own sticky positioning is inert and it
 * simply scrolls — which is why the same offset can be handed to both columns
 * and the taller one always yields to the shorter one. When both columns are
 * taller than the viewport, both scroll and the shorter one pins once its
 * bottom is reached.
 *
 * The pin releases at the bottom of the grid area, since that bounds a grid
 * item's sticky travel. The row's container must use `align-items: start`
 * (Tailwind `items-start`), otherwise items stretch to the full row height and
 * nothing can travel.
 *
 * Only active from the `lg` breakpoint up, where the columns sit side by side;
 * below that they stack and there is nothing to pin against. Returns an empty
 * style object until the element has been measured, so the server render and
 * the first client render agree.
 *
 * @param element The column element to measure. Pin `position: sticky` on this
 * same element and bind the returned style to it.
 * @param gap Pixels to keep between the pinned column and the viewport edge.
 * Match the value to the sticky offset used elsewhere on the page.
 * @returns A style object holding the resolved `top` offset, or empty while the
 * column is unmeasured or the layout is stacked.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const infoColumn = ref<HTMLElement>()
 * const infoColumnStyle = useStickyColumn(infoColumn)
 * </script>
 *
 * <template>
 *   <div class="lg:grid lg:grid-cols-2 lg:items-start">
 *     <div ref="infoColumn" class="lg:sticky" :style="infoColumnStyle">…</div>
 *   </div>
 * </template>
 * ```
 */
export function useStickyColumn(
  element: MaybeRefOrGetter<HTMLElement | undefined | null>,
  gap: number = DEFAULT_GAP_PX,
): ComputedRef<CSSProperties> {
  const columnHeight = ref(0)
  const { height: viewportHeight } = useWindowSize()
  const isSideBySide = useDefaultBreakpoints().greaterOrEqual('lg')

  // `offsetHeight` rather than the observer's box sizes: it is the laid-out
  // border-box height in the same pixel space as the viewport height compared
  // against below, and it stays correct when an accordion expands the column.
  const measure = () => {
    const column = toValue(element)
    if (column) {
      columnHeight.value = column.offsetHeight
    }
  }

  // A ResizeObserver only delivers at a rendering opportunity, which a page
  // that starts out hidden (background tab, prerender) does not get until it is
  // shown. Measuring once on mount means the offset is right from the first
  // paint instead of whenever the page happens to be rendered.
  // Vue routes a rejection of the promise a hook returns to the app error handler.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  tryOnMounted(() => nextTick(measure))
  useResizeObserver(element, measure)

  return computed(() => {
    if (!isSideBySide.value || !columnHeight.value) {
      return {}
    }

    // Anchoring the column's bottom edge `gap` above the viewport bottom gives
    // `viewportHeight - columnHeight - gap`, which for a column that fits the
    // viewport exceeds `gap` and would push it below the top edge. Taking the
    // smaller of the two caps it at `gap` without a separate branch, and the
    // formulas agree exactly at the height where the behaviors meet.
    return {
      top: `${Math.min(gap, viewportHeight.value - columnHeight.value - gap)}px`,
    }
  })
}
