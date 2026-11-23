import { router } from '@inertiajs/vue3'
import { usePage } from '@client/composables/usePage'
import type { VisitOptions } from '@inertiajs/core'
import {
  isAbsoluteLink,
  localizeLink,
  isExternalLink,
} from '@scayle/storefront/shared'
import { computed } from 'vue'

interface UseRouteReturn {
  baseUrl: import('vue').ComputedRef<string>
  path: import('vue').ComputedRef<string>
  /**
   * Query parameters of the current URL. A key may occur more than once —
   * a listing filter writes one occurrence per selected value — so read it
   * with `get` / `getAll` and copy it before building a new URL.
   */
  query: import('vue').ComputedRef<URLSearchParams>
  hash: import('vue').ComputedRef<string>
  fullPath: import('vue').ComputedRef<string>
  navigate: (to: string, options?: VisitOptions) => void
}

/**
 * Provides a parsed, normalized view of the current page URL and navigation helpers.
 * Wraps Inertia's `page.url` to expose individual URL parts as computed refs.
 * Includes a `navigate` helper that automatically localizes relative URLs.
 *
 * @example
 * ```ts
 * const { path, query, baseUrl, fullPath, hash, navigate } = useRoute()
 *
 * console.log(page.url)      // 'https://example.com/category/shoes?color=red#hash'
 * console.log(path.value)    // '/category/shoes'
 * console.log(query.value.get('color')) // 'red'
 * console.log(baseUrl.value) // 'https://example.com'
 * console.log(fullPath.value) // 'https://example.com/category/shoes?color=red'
 * console.log(hash.value)     // 'hash' (empty string if no fragment is present)
 *
 * // Navigate with automatic localization
 * navigate('/basket')
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/routing
 */
export function useRoute(): UseRouteReturn {
  const page = usePage()

  const url = computed(() => {
    // `page.url` is a path-only string (Inertia protocol), so the absolute URL
    // is determined entirely by the base passed as the second argument. In the
    // browser we use the live origin; during SSR we fall back to the origin the
    // server resolved for this request. On a single-host deployment the two are
    // the same value, so the renders agree and external-link detection does not
    // flip on hydration. When the resolved origin is pinned elsewhere (a
    // `config.domain` on a multi-host deployment, a country picked via the
    // `x-shop-country-id` override), the server-rendered origin is the
    // canonical one and wins the first paint.
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : page.props.storefront.origin

    return new URL(page.url, origin)
  })

  const baseUrl = computed(() => url.value.origin)

  /**
   * Navigates to the given path with automatic URL localization.
   *
   * Relative URLs are automatically prefixed with the active country path
   * when using path-based country selection, and visited with Inertia.
   * Absolute URLs (starting with 'http') and URLs on another origin are
   * loaded as a full page, unchanged, the same way `SFLink` renders them.
   *
   * @param to Target URL (external or site-relative path)
   * @param options Inertia visit options. For a full page load, only
   *   `replace` applies: it replaces the current history entry.
   * @throws When `to` is absolute and its scheme is not `http` or `https`,
   *   such as a `javascript:` URL, which `window.location` would run.
   *
   * @example
   * ```ts
   * // Navigate to basket with automatic localization
   * navigate('/basket')
   *
   * // Navigate with Inertia options
   * navigate('/basket', { replace: true })
   *
   * // Full page load to an external URL
   * navigate('https://example.com')
   * ```
   */
  const navigate = (to: string, options?: VisitOptions) => {
    // Same split as `SFLink`: Inertia fetches a visit in the background, which
    // another origin rejects (CORS), and a same-origin absolute URL is a shop
    // switch that has to reboot the app.
    if (isAbsoluteLink(to) || isExternalLink(to, baseUrl.value)) {
      // The target can come from content, such as a search navigation item's
      // URL, and `window.location` runs a `javascript:` URL in the shop's
      // origin.
      const { protocol } = new URL(to, baseUrl.value)
      if (protocol !== 'http:' && protocol !== 'https:') {
        throw new Error(
          `Cannot navigate to a "${protocol}" URL, only http and https targets load as a page`,
        )
      }

      if (options?.replace) {
        window.location.replace(to)
      } else {
        window.location.assign(to)
      }
      return
    }

    return router.visit(localizeLink(page.props.storefront, to), options)
  }

  return {
    baseUrl,
    path: computed(() => url.value.pathname),
    // Copied from the search string, so a mutation does not rewrite `url`.
    // Vue caches the computed: every read from this `useRoute()` shares that
    // copy until the search string changes.
    query: computed(() => new URLSearchParams(url.value.search)),
    hash: computed(() => url.value.hash.slice(1)),
    fullPath: computed(() => url.value.href),
    navigate,
  }
}
