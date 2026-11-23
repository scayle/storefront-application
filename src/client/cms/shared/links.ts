import type { SharedStorefrontCountry } from '@scayle/storefront'
import { isAbsoluteLink } from '@scayle/storefront/shared'

const URI_SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/i

/**
 * Normalizes a CMS-authored link before it is handed to the localization layer
 * (`SFLink` or `localizeLink`).
 *
 * Shared by every CMS provider (Amplience, Contentful, Contentstack, Storyblok)
 * so that authoring rules and runtime behavior stay aligned regardless of where
 * the link comes from.
 *
 * Behavior:
 * - External URLs (`http://`, `https://`) pass through unchanged.
 * - Internal paths are returned with a single leading slash.
 * - All leading country prefixes are stripped (e.g. `/de/about` and
 *   `/de/de/about` both become `/about` on a `de` country), so a localizer
 *   that re-prepends exactly one country prefix resolves authoring mistakes to
 *   a single, correctly-localized URL like `/de/about`. On a `path_except_default`
 *   country that is also the default, the localizer prepends no prefix at all,
 *   so the stripped result is the final URL.
 *
 * Authoring guideline: CMS authors should NOT include the country path in
 * link fields. The stripping is defensive and keeps content rendered against
 * one shop usable across other shops/countries.
 *
 * @param url Raw URL string from the CMS payload.
 * @param country Active storefront country. Only the `path` variant contributes
 *   a prefix to strip; the `domain` variant passes internal paths through.
 * @returns URL ready to be passed to `SFLink`.
 *
 * @example
 * ```ts
 * normalizeCmsLink('https://example.com', { path: 'de', ... })  // 'https://example.com'
 * normalizeCmsLink('/content/about',      { path: 'de', ... })  // '/content/about'
 * normalizeCmsLink('/de/content/about',   { path: 'de', ... })  // '/content/about'
 * normalizeCmsLink('/de/de/about',        { path: 'de', ... })  // '/about'
 * normalizeCmsLink('de/content/about',    { path: 'de', ... })  // '/content/about'
 * normalizeCmsLink('/de',                 { path: 'de', ... })  // '/'
 * normalizeCmsLink('/about',              { domain: '...', ... }) // '/about'
 * ```
 */
export const normalizeCmsLink = (
  url: string,
  country: SharedStorefrontCountry,
): string => {
  if (isAbsoluteLink(url)) {
    return url
  }

  const normalizedPath = url.startsWith('/') ? url : `/${url}`
  const countryPath = 'path' in country ? country.path : undefined

  if (!countryPath) {
    return normalizedPath
  }

  const prefixed = `/${countryPath}`
  let result = normalizedPath

  while (result === prefixed || result.startsWith(`${prefixed}/`)) {
    result = result.slice(prefixed.length) || '/'
  }

  return result
}

/**
 * Escapes a value for safe use inside a double-quoted HTML attribute.
 *
 * CMS `RichTextComponent`s build anchor HTML by hand and inject it with
 * `v-html`, so attribute values taken from CMS payloads (`href`, `rel`,
 * `target`) must be escaped before interpolation to prevent an authored value
 * from breaking out of the attribute. Shared by every provider so the escaping
 * behavior stays identical regardless of the CMS.
 *
 * @param value Attribute value from a CMS rich text node.
 * @returns The value with `&` and `"` replaced by their HTML entities.
 *
 * @example
 * ```ts
 * escapeAttr('nofollow noopener')   // 'nofollow noopener'
 * escapeAttr('" onclick="alert(1)') // '&quot; onclick=&quot;alert(1)'
 * escapeAttr('a&b')                 // 'a&amp;b'
 * ```
 */
export const escapeAttr = (value: unknown): string =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/** URI schemes that are safe to render in an `href` without further checks. */
const SAFE_URI_SCHEMES = new Set(['http', 'https', 'mailto', 'tel'])

/**
 * Checks whether a URI's scheme is safe to render in an anchor `href`.
 *
 * Relative references (no scheme, e.g. `/foo`, `#foo`) have nothing to
 * validate and are always safe; absolute URIs are only safe when their scheme
 * is allowlisted, which blocks `javascript:`, `data:`, `vbscript:`, and
 * similar script-bearing schemes before the HTML reaches the sanitizer.
 * Shared by every CMS provider so link-protocol handling stays aligned.
 *
 * Tabs and newlines are removed before matching, and the rest is trimmed,
 * because browsers drop them while parsing a URL. So `" javascript:..."` and
 * `"java\tscript:..."` both resolve to the `javascript:` scheme at click time
 * and must be rejected here too.
 *
 * @param uri Href value to check, after any localization.
 * @returns True when the URI has no scheme or an allowlisted one.
 *
 * @example
 * ```ts
 * hasSafeLinkProtocol('/content/about')      // true  (relative, no scheme)
 * hasSafeLinkProtocol('https://example.com') // true  (allowlisted scheme)
 * hasSafeLinkProtocol('javascript:alert(1)') // false (script-bearing scheme)
 * hasSafeLinkProtocol(' javascript:alert(1)')// false (whitespace stripped first)
 * hasSafeLinkProtocol('java\tscript:alert(1)')// false (embedded tab stripped first)
 * ```
 */
export const hasSafeLinkProtocol = (uri: string): boolean => {
  const schemeMatch = URI_SCHEME_PATTERN.exec(
    uri.replace(/[\t\n\r]/g, '').trim(),
  )
  // Group 1 is not optional in URI_SCHEME_PATTERN, so a match always carries it.
  return !schemeMatch || SAFE_URI_SCHEMES.has(schemeMatch[1]!.toLowerCase())
}

/**
 * Builds a safe anchor `href` value from a CMS-authored URL.
 *
 * Combines the scheme allowlist and attribute escaping into the single step a
 * `RichTextComponent` link renderer needs: an allowlisted or relative URL is
 * escaped for attribute use, anything else collapses to `fallback`. Centralized
 * so a new provider (or a new link node type within one) cannot interpolate a
 * raw CMS URL into `href` and skip the protocol check.
 *
 * @param url Raw URL from the CMS payload, after any localization.
 * @param fallback Href to emit when the URL's scheme is not allowlisted.
 * @returns An escaped, attribute-safe href, or `fallback` for unsafe schemes.
 *
 * @example
 * ```ts
 * buildSafeHref('/content/about')      // '/content/about'
 * buildSafeHref('javascript:alert(1)') // '#'
 * buildSafeHref('https://x/"onclick=') // 'https://x/&quot;onclick='
 * ```
 */
export const buildSafeHref = (url: string, fallback = '#'): string =>
  hasSafeLinkProtocol(url) ? escapeAttr(url) : fallback
