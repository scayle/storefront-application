import { nextTick, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'

interface UseReturnFocusReturn {
  setTrigger: (value: unknown) => void
  returnFocus: (options?: { defer?: boolean }) => Promise<void>
  triggerEl: ShallowRef<HTMLElement | null>
}

/**
 * Captures a trigger element and restores focus to it — the "return focus to the
 * opener" pattern shared by flyouts/popovers, so keyboard focus is not stranded
 * on `<body>` when the overlay closes.
 *
 * Bind `setTrigger` as the trigger's `ref` (it resolves a component instance's
 * root `$el`, or takes a raw element), then call `returnFocus()` on close/Escape.
 *
 * `returnFocus()` focuses **synchronously** by default, which matters when the
 * overlay is hidden in the same tick: focus the trigger first so hiding the
 * overlay does not yank focus to `<body>`. Pass `{ defer: true }` to focus after
 * the next render instead — needed when the trigger itself is re-rendering (e.g.
 * after an async action changes it).
 *
 * @returns An object with:
 *   - `setTrigger(value)` — a function ref to bind as the trigger's `:ref`. It
 *     stores the element to focus, resolving a component instance's root `$el`
 *     (or accepting a raw element); non-focusable values are ignored.
 *   - `returnFocus(options?)` — restores focus to the captured trigger. Returns
 *     a `Promise<void>`. `options.defer` (`boolean`, default `false`) focuses
 *     synchronously when `false`, or after the next render tick when `true`.
 *   - `triggerEl` — the captured element as a `ShallowRef<HTMLElement | null>`
 *     (`null` until `setTrigger` receives a focusable element).
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const isOpen = ref(false)
 * const { setTrigger, returnFocus } = useReturnFocus()
 *
 * // On close, focus the trigger first, then hide the overlay.
 * const close = () => { returnFocus(); isOpen.value = false }
 * </script>
 *
 * <template>
 *   <button :ref="setTrigger" @click="isOpen = true">Open</button>
 *   <div v-if="isOpen" @keydown.escape="close">…</div>
 * </template>
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/accessibility
 */
export function useReturnFocus(): UseReturnFocusReturn {
  // `shallowRef`: never deep-proxy the stored DOM element.
  const triggerEl = shallowRef<HTMLElement | null>(null)

  const setTrigger = (value: unknown) => {
    // Resolve a component instance's root element; accept a raw element too.
    const element =
      value && typeof value === 'object' && '$el' in value ? value.$el : value
    // Duck-type on `focus` rather than `instanceof HTMLElement`: robust across
    // realms and skips non-focusable roots (e.g. a fragment's comment node).
    triggerEl.value =
      element && typeof (element as { focus?: unknown }).focus === 'function'
        ? (element as HTMLElement)
        : null
  }

  const returnFocus = async (options: { defer?: boolean } = {}) => {
    if (options.defer) {
      await nextTick()
    }
    triggerEl.value?.focus()
  }

  return { setTrigger, returnFocus, triggerEl }
}
