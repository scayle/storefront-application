import { ref, shallowReadonly } from 'vue'
import type { Ref } from 'vue'

interface UsePageMetaReturn {
  /**
   * The current page's title, or an empty string while no `PageMetaHead` is
   * mounted (before hydration, or on a page that renders none, such as `Error`
   * or a CMS page without meta).
   */
  currentTitle: Readonly<Ref<string>>
  /** Sets the current page's title. Does nothing during a server render. */
  setCurrentTitle: (title: string) => void
}

// Module-level singleton: `PageMetaHead` sits inside each page, while its
// readers (the route announcer in the layout, the tracking plugin) live outside
// it, so they share this state without a prop chain between them.
//
// INVARIANT — client-only: module scope means this state is shared across every
// request an SSR Node process handles. Only ever write it on the client, never
// during a server render, or one request's title outlives it. `PageMetaHead`
// clears it on unmount, so it never outlives the page that set it.
const currentTitle = ref('')

/**
 * Holds the current page's meta values, mirrored by `PageMetaHead` from the
 * page's `meta` prop, for code outside the page that reacts to them: the route
 * announcer and the GA4 `page_view` title.
 *
 * @returns The current title, read-only, and its setter.
 *
 * @example
 * ```ts
 * const { currentTitle } = usePageMeta()
 * watch(currentTitle, (next) => {
 *   // …react to title changes
 * })
 * ```
 */
export function usePageMeta(): UsePageMetaReturn {
  const setCurrentTitle = (title: string) => {
    // Enforces the module-scope invariant above: a server-render write would
    // outlive the request.
    if (import.meta.env.SSR) {
      return
    }

    currentTitle.value = title
  }

  return {
    currentTitle: shallowReadonly(currentTitle),
    setCurrentTitle,
  }
}
