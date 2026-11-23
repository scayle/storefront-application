import { isAbsoluteLink } from '@scayle/storefront/shared'
import type { URLType } from '@shared/types/cms/amplience'

/**
 * Resolves the target URL from an Amplience link field.
 *
 * Amplience models a link as a plain `link` string, paired on some content types
 * with a `url_type` discriminant. Unlike Storyblok there is no story reference to
 * resolve, so this only has to decide whether to prepend a leading slash.
 *
 * An absolute URL passes through untouched regardless of `url_type`, because an
 * author who pastes `https://…` into a field marked internal still means an
 * external link, and prefixing it would produce a broken path. Everything else is
 * normalized to a single leading slash so `normalizeCmsLink` and `SFLink` can
 * localize it. `url_type` is therefore only consulted for the ambiguous case of a
 * protocol-less host like `example.com`, which `ButtonComponent` (a content type
 * with no `url_type` field) treats as internal.
 *
 * @param link Raw link string from the CMS payload
 * @param urlType Whether the destination is an internal path or an external URL.
 *   Omit on content types that do not carry the field.
 * @returns Resolved URL, or an empty string when no link is set
 *
 * @example
 * ```ts
 * generateLink('content/about', 'internal')      // '/content/about'
 * generateLink('https://scayle.com', 'external') // 'https://scayle.com'
 * generateLink('https://scayle.com', 'internal') // 'https://scayle.com'
 * generateLink('example.com', 'external')        // 'example.com'
 * ```
 */
export const generateLink = (
  link: string | undefined,
  urlType?: URLType,
): string => {
  const trimmed = link?.trim()

  if (!trimmed) {
    return ''
  }

  if (isAbsoluteLink(trimmed) || urlType === 'external') {
    return trimmed
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}
