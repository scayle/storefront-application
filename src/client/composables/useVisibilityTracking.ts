import type {
  MaybeComputedElementRef,
  UseIntersectionObserverReturn,
} from '@vueuse/core'
import { unrefElement, useIntersectionObserver } from '@vueuse/core'
import { computed } from 'vue'

/**
 * Observes an element and reports its viewport visibility, calling
 * `onVisibilityChange` with `true` when the element enters the viewport and
 * `false` when it leaves. Wraps `useIntersectionObserver`, so it stays inert
 * during SSR and disconnects when the component unmounts.
 *
 * @param target - The element to observe, as a template ref, getter, or element
 * @param onVisibilityChange - Called on every viewport entry and exit
 * @returns The intersection observer controls (`stop`, `pause`, `resume`)
 *
 * @example
 * ```vue
 * <template>
 *   <div ref="target">…</div>
 * </template>
 *
 * <script setup lang="ts">
 * const target = useTemplateRef('target')
 * useVisibilityTracking(target, (visible) => {
 *   if (visible) trackImpression()
 * })
 * </script>
 * ```
 */
export function useVisibilityTracking(
  target: MaybeComputedElementRef,
  onVisibilityChange: (isVisible: boolean) => void,
): UseIntersectionObserverReturn {
  // Guards against non-element nodes. `observe()` only accepts an `Element`,
  // so narrow to one and skip observing otherwise. Defensive: any multi-root
  // (fragment) component used as a target would expose a comment node as `$el`.
  // `nodeType === 1` identifies an element without touching the DOM `Element`
  // global, so it stays safe during SSR.
  const element = computed(() => {
    const el = unrefElement(target)
    return el && el.nodeType === 1 ? el : undefined
  })

  return useIntersectionObserver(element, ([entry]) =>
    onVisibilityChange(entry?.isIntersecting ?? false),
  )
}
