import type { StoryblokMultilink } from '@shared/types/cms/storyblok'

/**
 * Resolves the target URL from a Storyblok multilink object.
 * Used by Storyblok link and button components before route localization.
 *
 * @param url Storyblok multilink object from the CMS payload
 * @returns Story slug for story links, URL for URL links, or an empty string when missing
 *
 * @example
 * ```ts
 * const href = generateLink({ linktype: 'story', story: { full_slug: 'de/homepage' } })
 * // href === 'de/homepage'
 * ```
 */
export const generateLink = (url?: StoryblokMultilink): string => {
  if (!url) {
    return ''
  }

  if (url.linktype === 'story' && url.story && 'full_slug' in url.story) {
    return url.story.full_slug
  }

  return url.url || url.cached_url || ''
}
