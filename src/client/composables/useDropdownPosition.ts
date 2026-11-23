import { nextTick, onMounted, shallowReadonly, shallowRef, watch } from 'vue'
import type { CSSProperties, Ref, ShallowRef } from 'vue'
import {
  defaultWindow,
  useEventListener,
  usePreferredReducedMotion,
} from '@vueuse/core'

/** Distance in pixels between the trigger and the panel. */
const TRIGGER_GAP = 4

/** Distance in pixels the panel keeps from the edges of the viewport. */
const VIEWPORT_PADDING = 8

/** Elements and state `useDropdownPosition` calculates the panel position from. */
export interface UseDropdownPositionOptions {
  /** The element the panel anchors to above `lg`. */
  anchor: Readonly<ShallowRef<HTMLElement | null>>
  /** The options panel, measured to check whether it fits below the trigger. */
  panel: Readonly<ShallowRef<HTMLElement | null>>
  /** Whether the panel is open. */
  isOpen: Readonly<Ref<boolean>>
  /**
   * Whether the viewport is below `lg`, where the panel docks to the bottom of
   * the viewport.
   */
  isMobile: Readonly<Ref<boolean>>
  /**
   * Called when the viewport resizes while the panel is open. `SFDropdown`
   * passes its `close`.
   */
  onResize: () => void
}

/**
 * Positions and sizes the options panel of a dropdown.
 *
 * The panel lives in the top layer, so it is placed with fixed coordinates
 * rather than flowing under the trigger: below `lg` it docks to the bottom of
 * the viewport as a sheet, and above `lg` it anchors to the trigger's left
 * edge, clamped to the space remaining to the right.
 *
 * Above `lg` the panel opens below the trigger when it fits there. When it
 * does not, it opens above the trigger if it fits there, and otherwise stays
 * below while the page scrolls far enough to bring it into view. Inside a
 * `<dialog>` the page does not scroll, because the dialog locks it, so a panel
 * that fits on neither side stays below and can be cut off.
 *
 * CSS anchor positioning (`position-try-fallbacks: flip-block`) could do the
 * flip, but not the scroll, and not every supported browser has it yet.
 *
 * The panel is at least as wide as the trigger and grows to fit its rows,
 * up to the space remaining to the right. A trigger narrower than its content,
 * like the basket's size selector in an inline attribute row, therefore still
 * opens a readable panel, without a fixed floor imposing one component's needs
 * on every other dropdown.
 *
 * The position is calculated when the panel opens, after mount when it starts
 * open, and on every page scroll while it is open. A viewport resize while open
 * calls `onResize` instead. The scroll and resize listeners exist only while the
 * panel is open and are removed when the calling component unmounts. Used by
 * `SFDropdown`, which binds the returned style to its panel.
 *
 * @param options The elements and state the position is calculated from.
 * @returns The panel's inline position and size, or `undefined` until the panel
 * has been opened.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const anchor = useTemplateRef('anchor')
 * const panel = useTemplateRef('panel')
 * const isMobile = useDefaultBreakpoints().smaller('lg')
 * const panelStyle = useDropdownPosition({
 *   anchor,
 *   panel,
 *   isOpen,
 *   isMobile,
 *   onResize: close,
 * })
 * </script>
 *
 * <template>
 *   <div ref="anchor">…</div>
 *   <div ref="panel" v-popover="isOpen" :style="panelStyle">…</div>
 * </template>
 * ```
 */
export function useDropdownPosition(
  options: UseDropdownPositionOptions,
): Readonly<Ref<CSSProperties | undefined>> {
  const { anchor, panel, isOpen, isMobile, onResize } = options
  const style = shallowRef<CSSProperties>()
  const reducedMotion = usePreferredReducedMotion()
  // Decided once per opening, so the panel does not switch sides while the
  // page scrolls under it.
  let opensAbove = false

  const calculate = () => {
    if (!anchor.value) {
      return
    }

    if (isMobile.value) {
      style.value = {
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        top: 'auto',
      }
      return
    }

    const el = anchor.value
    const rect = el.getBoundingClientRect()
    const maxWidth = Math.max(
      VIEWPORT_PADDING * 2,
      window.innerWidth - rect.left - VIEWPORT_PADDING,
    )
    const minWidth = Math.min(el.offsetWidth, maxWidth)

    style.value = {
      position: 'fixed',
      left: `${rect.left}px`,
      width: 'max-content',
      minWidth: `${minWidth}px`,
      maxWidth: `${maxWidth}px`,
      right: 'auto',
      margin: '0',
      ...(opensAbove
        ? {
            top: 'auto',
            bottom: `${window.innerHeight - rect.top + TRIGGER_GAP}px`,
          }
        : { top: `${rect.bottom + TRIGGER_GAP}px`, bottom: 'auto' }),
    }
  }

  // Runs once the panel is displayed, because a hidden panel has no height.
  const bringIntoView = () => {
    if (!anchor.value || !panel.value || isMobile.value) {
      return
    }

    const rect = anchor.value.getBoundingClientRect()
    const panelHeight = panel.value.offsetHeight
    const overflow =
      rect.bottom +
      TRIGGER_GAP +
      panelHeight +
      VIEWPORT_PADDING -
      window.innerHeight
    if (overflow <= 0) {
      return
    }

    if (rect.top - TRIGGER_GAP - VIEWPORT_PADDING >= panelHeight) {
      opensAbove = true
      calculate()
      return
    }

    // A modal locks the page for the user only, so a scroll from code would
    // still move the page behind it.
    if (anchor.value.closest('dialog')) {
      return
    }

    // The scroll listener keeps the panel under the trigger while this runs.
    window.scrollBy({
      top: overflow,
      behavior: reducedMotion.value === 'reduce' ? 'instant' : 'smooth',
    })
  }

  // The first `calculate` places the panel before it renders, so it never
  // shows at (0, 0). The check for space follows after the render.
  const place = async () => {
    opensAbove = false
    calculate()
    await nextTick()
    if (isOpen.value) {
      bringIntoView()
    }
  }

  // A `null` target detaches the listeners, so they are only attached while the
  // panel is open, and `useEventListener` also detaches them when the calling
  // scope is disposed. `defaultWindow` is `undefined` during SSR, where a panel
  // can render open.
  const windowWhileOpen = () => (isOpen.value ? defaultWindow : null)
  // Resize goes to `onResize` rather than re-anchoring: the trigger's position
  // may have moved, and re-anchoring a top-layer popover mid-interaction is
  // jarring. The arrow keeps the resize `Event` out of `onResize`'s arguments.
  useEventListener(windowWhileOpen, 'resize', () => onResize())
  useEventListener(windowWhileOpen, 'scroll', calculate, { passive: true })

  watch(isOpen, (open) => {
    if (open) {
      void place()
    }
  })

  // Handle the case where the panel is open on initial mount (e.g. Storybook).
  // The popover lives in the top layer, so it needs the inline fixed-position
  // values from `calculate`. Without them it falls back to (0, 0).
  onMounted(async () => {
    if (isOpen.value) {
      await nextTick()
      await place()
    }
  })

  return shallowReadonly(style)
}
