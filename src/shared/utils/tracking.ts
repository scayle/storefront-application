import type { PageComponentName } from '@scayle/storefront'
import { ANALYTICS_MAX_PATH_LENGTH } from '@scayle/storefront/shared'
import { IMAGE_VIEW_QUERY_KEY } from '@shared/constants/imageView'
import { PageTypeSnakeCase } from '@shared/types/Tracking'
import type { PageType, TrackingDeviceType } from '@shared/types/Tracking'

const IOS_USER_AGENT = /ipad|iphone|ipod/i
const ANDROID_USER_AGENT = /android/i

/**
 * Query keys whose values are safe to send to tracking: pagination, sorting,
 * the product variant, the listing image view, the registration view of the
 * sign-in page, campaign attribution and ad click ids. None of them carries a
 * token, a secret or a personal identifier. A shop that adds a query key of its
 * own adds it here once it is safe to track, and a shop whose ad platforms
 * differ edits the click ids.
 */
const TRACKED_QUERY_KEYS = new Set([
  'page',
  'sort',
  'variantId',
  IMAGE_VIEW_QUERY_KEY,
  'register',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'twclid',
  'ttclid',
])

/**
 * `filters[<slug>]`: the search term, the price and reduction bounds, and the
 * attribute and boolean filters, whose slugs are the shop's attribute groups.
 */
const FILTER_QUERY_KEY = /^filters\[[\w-]+\]$/

/**
 * Keeps the query pairs whose key is on the tracking allowlist.
 *
 * Why an allowlist: a URL can carry a credential, such as the password reset
 * `hash`, the order success `cbd` or a CMS preview token. A denylist would miss
 * the next one a shop adds.
 *
 * Kept pairs keep their order and repeats and are encoded again, so an encoded
 * `&` or `=` inside a value cannot add pairs.
 */
const toTrackedQuery = (query: URLSearchParams): string =>
  new URLSearchParams(
    [...query].filter(
      ([key]) => TRACKED_QUERY_KEYS.has(key) || FILTER_QUERY_KEY.test(key),
    ),
  ).toString()

/**
 * Reduces a URL to what tracking may report: the query keys on the tracking
 * allowlist and no fragment. GTM forwards `page_location` to GA4, and the
 * SCAYLE Analytics session reads its landing values from the result.
 *
 * @param href Absolute URL, usually `window.location.href`
 * @returns The URL with only the allowlisted query keys and no fragment
 * @throws When `href` is not an absolute URL
 */
export function toTrackedUrl(href: string): string {
  const url = new URL(href)
  url.search = toTrackedQuery(url.searchParams)
  url.hash = ''

  return url.href
}

/**
 * Builds the `page_path` both tracking pipelines report: the path with the
 * allowlisted query keys. Falls back to the path alone when the query would
 * take it over `ANALYTICS_MAX_PATH_LENGTH`, because the analytics route refuses
 * an event whose `page_path` is over that cap.
 *
 * @param path Path of the page, with the country prefix
 * @param query Query string of the page
 * @returns The path with the allowlisted query string, or the path alone
 *
 * @example
 * ```ts
 * toTrackedPath('/de/signin', new URLSearchParams('hash=secret&register=true'))
 * // '/de/signin?register=true'
 * ```
 */
export function toTrackedPath(path: string, query: URLSearchParams): string {
  const trackedQuery = toTrackedQuery(query)
  const trackedPath = trackedQuery ? `${path}?${trackedQuery}` : path

  return trackedPath.length > ANALYTICS_MAX_PATH_LENGTH ? path : trackedPath
}

/**
 * Resolves the `page_type` of a page, the value the GA4 context and the SCAYLE
 * Analytics context both report. The shop's start page is `homepage`, every
 * other page the value its Inertia component maps to in
 * {@link PageTypeSnakeCase}. The map is total over {@link PageComponentName},
 * so every registered page resolves to a listed value.
 *
 * @param componentName Inertia page component identifier.
 * @param isHomePage Whether the page is the shop's start page, which renders
 *   the `CmsPage` component.
 * @returns The snake_case `page_type` for the page.
 */
export function resolveTrackingPageType(
  componentName: PageComponentName,
  isHomePage: boolean,
): PageType {
  if (isHomePage) {
    return 'homepage'
  }
  // No runtime fallback is needed: the client page resolver throws
  // "Page not found" for any component without a page file, and the
  // `satisfies` constraint on PageTypeSnakeCase keeps the map total over
  // PageComponentName, so an unmapped name cannot reach this lookup.
  return PageTypeSnakeCase[componentName]
}

/**
 * Classifies a browser from its User-Agent string. The GA4 tracking plugin and
 * the SCAYLE Analytics dispatcher both pass `navigator.userAgent`, so both
 * report the same values.
 *
 * @param userAgent The User-Agent string
 * @returns `ios` for iPhone, iPad and iPod, `android` for Android, `desktop`
 *   for everything else
 */
export function resolveTrackingDeviceType(
  userAgent: string,
): TrackingDeviceType {
  if (IOS_USER_AGENT.test(userAgent)) {
    return 'ios'
  }
  if (ANDROID_USER_AGENT.test(userAgent)) {
    return 'android'
  }
  return 'desktop'
}
