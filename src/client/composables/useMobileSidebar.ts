import { shallowRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { createSharedComposable, unrefElement } from '@vueuse/core'
import { useDefaultBreakpoints } from '@client/composables/useDefaultBreakpoints'
import { useOverlay } from '@client/composables/useOverlay'
import { usePage } from '@client/composables/usePage'

/**
 * Returns the mobile navigation sidebar, shared by the header's menu toggle and
 * the layout, which hides the promotion ribbon while it is open.
 *
 * Below the `lg` breakpoint the sidebar is the main navigation, so its code
 * loads once the browser is idle after the page has mounted. On wider screens
 * it loads only on interaction with the toggle, which is hidden there.
 * Crawlers read the category links from the desktop navigation, which stays
 * in the server-rendered HTML.
 *
 * @returns The overlay controls (`toggle`, `close`, `isOpen`, `triggerAttrs`,
 * ...) and `menuToggle`, which the header binds to its menu toggle with `ref`.
 */
export const useMobileSidebar = createSharedComposable(() => {
  const page = usePage()
  const breakpoints = useDefaultBreakpoints()
  // `SFOverlayHost` renders the sidebar at the end of the page. The sidebar
  // shows itself with the toggle as the popover's source, which puts it right
  // after the toggle in the keyboard order again.
  const menuToggle = shallowRef<HTMLElement | ComponentPublicInstance | null>(
    null,
  )

  const overlay = useOverlay().create(
    () => import('@client/components/ui/navigation/header/SFMobileSidebar.vue'),
    {
      props: () => ({
        navigationItems: page.props.navigation,
        // The toggle is an `SFButton`, which renders a `<button>` or an `<a>`.
        toggleElement: unrefElement(menuToggle) as HTMLElement | undefined,
      }),
      preload: () =>
        breakpoints.greaterOrEqual('lg').value ? 'interaction' : 'idle',
    },
  )

  return { ...overlay, menuToggle }
})
