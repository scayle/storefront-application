import { describe, expect, it } from 'vitest'
import { generateLink } from './link'

describe('generateLink', () => {
  it.for([
    {
      reason: 'prefixes an internal path with a single leading slash',
      link: 'content/about',
      urlType: 'internal',
      expected: '/content/about',
    },
    {
      reason: 'leaves an already-prefixed internal path alone',
      link: '/content/about',
      urlType: 'internal',
      expected: '/content/about',
    },
    {
      reason: 'passes an external URL through untouched',
      link: 'https://scayle.com',
      urlType: 'external',
      expected: 'https://scayle.com',
    },
    {
      reason: 'passes an absolute URL through even when marked internal',
      link: 'https://scayle.com/x',
      urlType: 'internal',
      expected: 'https://scayle.com/x',
    },
    {
      reason: 'treats a link as internal when the content type has no url_type',
      link: 'content/about',
      urlType: undefined,
      expected: '/content/about',
    },
    {
      reason: 'honors an explicit external type for a protocol-less host',
      link: 'example.com',
      urlType: 'external',
      expected: 'example.com',
    },
    {
      reason: 'trims surrounding whitespace an author may have pasted in',
      link: '  /content/about  ',
      urlType: 'internal',
      expected: '/content/about',
    },
    {
      reason: 'returns an empty string for an unset link',
      link: undefined,
      urlType: 'internal',
      expected: '',
    },
    {
      reason: 'returns an empty string for an empty link',
      link: '',
      urlType: 'internal',
      expected: '',
    },
    {
      reason: 'returns an empty string for a blank link',
      link: '   ',
      urlType: 'internal',
      expected: '',
    },
  ] as const)('$reason', ({ link, urlType, expected }) => {
    expect(generateLink(link, urlType)).toBe(expected)
  })
})
