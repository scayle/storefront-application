import { describe, expect, it } from 'vitest'
import type {
  StoryblokMultilink,
  StoryblokMultilinkStory,
} from '@shared/types/cms/storyblok'
import { generateLink } from './link'

/** Creates a partial StoryblokMultilink for testing. */
const createMultilink = (
  overrides: Partial<StoryblokMultilink>,
): StoryblokMultilink => overrides as unknown as StoryblokMultilink

describe('generateLink', () => {
  it.for([
    {
      case: 'the full_slug of a story link',
      link: createMultilink({
        linktype: 'story',
        story: { full_slug: 'de/homepage' } as StoryblokMultilinkStory,
      }),
      expected: 'de/homepage',
    },
    {
      case: 'an empty string for a story link without full_slug',
      link: createMultilink({
        linktype: 'story',
        story: {} as StoryblokMultilinkStory,
      }),
      expected: '',
    },
    {
      case: 'the url of a URL-type link',
      link: createMultilink({ linktype: 'url', url: 'https://example.com' }),
      expected: 'https://example.com',
    },
    {
      case: 'the cached_url when url is empty',
      link: createMultilink({
        linktype: 'url',
        url: '',
        cached_url: 'https://fallback.com',
      }),
      expected: 'https://fallback.com',
    },
    {
      case: 'an empty string for undefined input',
      link: undefined,
      expected: '',
    },
    {
      case: 'an empty string when no URL fields are present',
      link: createMultilink({}),
      expected: '',
    },
  ])('returns $case', ({ link, expected }) => {
    expect(generateLink(link)).toBe(expected)
  })
})
