import { onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

interface UseScrollActiveIntoViewReturn {
  /**
   * Ref for the navigation container element.
   */
  navRef: Ref<HTMLElement | undefined>
  /**
   * Click handler for individual nav items; scrolls the clicked item into view.
   */
  onItemClick: (event: MouseEvent) => void
}

/**
 * Keeps the active item of a horizontally-scrollable navigation row visible.
 *
 * Bind `navRef` to the row container and `onItemClick` to each item's click.
 * On (re)mount the item marked `aria-current="page"` is scrolled fully into
 * view (covers initial load and the remount after navigating), and clicking a
 * partially-hidden item scrolls it into view immediately. Used by the account
 * chip row and the PLP category chips.
 *
 * The click scroll uses smooth animation, except when the user prefers reduced
 * motion (`prefers-reduced-motion: reduce`), where it jumps instantly.
 *
 * Items must be anchors and the active one must carry `aria-current="page"`.
 *
 * @returns `navRef` for the container and `onItemClick` for each item.
 * @example
 * ```vue
 * <nav ref="navRef">
 *   <SFLink :aria-current="active ? 'page' : undefined" @click="onItemClick" />
 * </nav>
 * ```
 */
export function useScrollActiveIntoView(): UseScrollActiveIntoViewReturn {
  const navRef = ref<HTMLElement>()
  const reducedMotion = usePreferredReducedMotion()

  // `block: 'nearest'` keeps the page from jumping vertically when the row is
  // already in view. Smooth scrolling is opt-in and suppressed under reduced
  // motion; the mount-time call always jumps instantly.
  const scrollIntoView = (
    item: HTMLElement | null | undefined,
    smooth = false,
  ) =>
    item?.scrollIntoView?.({
      inline: 'nearest',
      block: 'nearest',
      behavior:
        smooth && reducedMotion.value !== 'reduce' ? 'smooth' : 'instant',
    })

  const onItemClick = (event: MouseEvent) =>
    scrollIntoView((event.target as HTMLElement | null)?.closest('a'), true)

  onMounted(() =>
    scrollIntoView(
      navRef.value?.querySelector<HTMLElement>('[aria-current="page"]'),
    ),
  )

  return { navRef, onItemClick }
}
