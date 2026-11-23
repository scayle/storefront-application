import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { computed, ref, toValue } from 'vue'

interface UseSliderArrowVisibilityReturn {
  /** Ref tracking whether the slider is hovered. */
  isHovered: Ref<boolean>
  /** Ref tracking whether the slider or its children have focus. */
  isFocused: Ref<boolean>
  /** Computed flag indicating arrows should be visible (hovered, focused, or forced). */
  areArrowsVisible: ComputedRef<boolean>
}

/**
 * Tracks hover/focus state for a slider's prev/next arrows and derives whether
 * they should be visible. Shared by `SFImageGallery` and `SFImageStrip`, which
 * both reveal their chevrons only while the slider is hovered or focused.
 *
 * Wire the returned `isHovered` / `isFocused` refs to the slider root's
 * `@mouseenter`/`@mouseleave` and `@focusin`/`@focusout` handlers, and bind
 * `areArrowsVisible` to the arrow container's opacity classes.
 *
 * @param forceVisible Optional ref or getter that, when `true`, keeps the arrows visible regardless of hover or focus. Useful when a parent owns the hover region, like a product card that reveals arrows on card hover.
 * @returns `isHovered` and `isFocused` state refs to wire to the slider root, plus the derived `areArrowsVisible` computed.
 *
 * @example
 * ```ts
 * const { isHovered, isFocused, areArrowsVisible } = useSliderArrowVisibility(
 *   () => forceArrowsVisible,
 * )
 * ```
 */
export function useSliderArrowVisibility(
  forceVisible?: MaybeRefOrGetter<boolean>,
): UseSliderArrowVisibilityReturn {
  const isHovered = ref(false)
  const isFocused = ref(false)

  const areArrowsVisible = computed(
    () => isHovered.value || isFocused.value || toValue(forceVisible) === true,
  )

  return { isHovered, isFocused, areArrowsVisible }
}
