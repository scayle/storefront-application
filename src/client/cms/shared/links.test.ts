import type { SharedStorefrontCountry } from '@scayle/storefront'
import { describe, expect, it } from 'vitest'
import {
  buildSafeHref,
  escapeAttr,
  hasSafeLinkProtocol,
  normalizeCmsLink,
} from './links'

const pathCountry = (path: string) =>
  ({ path }) as unknown as SharedStorefrontCountry
const domainCountry = () =>
  ({ domain: 'example.com' }) as unknown as SharedStorefrontCountry

describe('normalizeCmsLink', () => {
  it.for([
    {
      case: 'passes https URLs through unchanged',
      url: 'https://example.com/page',
      country: pathCountry('de'),
      expected: 'https://example.com/page',
    },
    {
      case: 'passes http URLs through unchanged',
      url: 'http://example.com',
      country: pathCountry('de'),
      expected: 'http://example.com',
    },
    {
      case: 'adds a leading slash when missing',
      url: 'about',
      country: pathCountry('de'),
      expected: '/about',
    },
    {
      case: 'preserves an existing leading slash',
      url: '/about',
      country: pathCountry('de'),
      expected: '/about',
    },
    {
      case: 'strips the active country prefix from a leading-slash path',
      url: '/de/content/about',
      country: pathCountry('de'),
      expected: '/content/about',
    },
    {
      case: 'strips the active country prefix from a slash-less path',
      url: 'de/content/about',
      country: pathCountry('de'),
      expected: '/content/about',
    },
    {
      case: 'strips repeated country prefixes so SFLink adds exactly one back',
      url: '/de/de/about',
      country: pathCountry('de'),
      expected: '/about',
    },
    {
      case: 'strips repeated country prefixes down to "/" when only the prefix remains',
      url: '/de/de',
      country: pathCountry('de'),
      expected: '/',
    },
    {
      case: 'returns "/" when the path equals the country prefix',
      url: '/de',
      country: pathCountry('de'),
      expected: '/',
    },
    {
      case: 'returns "/" when the path equals the country prefix without leading slash',
      url: 'de',
      country: pathCountry('de'),
      expected: '/',
    },
    {
      case: 'preserves the path when a different country prefix is present',
      url: '/fr/about',
      country: pathCountry('de'),
      expected: '/fr/about',
    },
    {
      case: 'preserves the path when no country path is provided (domain mode)',
      url: '/de/about',
      country: domainCountry(),
      expected: '/de/about',
    },
  ])('$case', ({ url, country, expected }) => {
    expect(normalizeCmsLink(url, country)).toBe(expected)
  })
})

describe('escapeAttr', () => {
  it('escapes double quotes so a value cannot break out of the attribute', () => {
    expect(escapeAttr('" onclick="alert(1)')).toBe(
      '&quot; onclick=&quot;alert(1)',
    )
  })

  it('escapes ampersands before other entities', () => {
    expect(escapeAttr('a&b')).toBe('a&amp;b')
  })

  it('leaves a plain value unchanged', () => {
    expect(escapeAttr('nofollow noopener')).toBe('nofollow noopener')
  })

  it('coerces non-string input to a string', () => {
    expect(escapeAttr(undefined)).toBe('undefined')
  })
})

describe('hasSafeLinkProtocol', () => {
  it.each(['http', 'https', 'mailto', 'tel'])(
    'allows the %s scheme',
    (scheme) => {
      expect(hasSafeLinkProtocol(`${scheme}:example`)).toBe(true)
    },
  )

  it('treats scheme matching as case-insensitive', () => {
    expect(hasSafeLinkProtocol('HTTPS://example.com')).toBe(true)
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', 'vbscript:alert(1)'])(
    'rejects the dangerous URI %s',
    (uri) => {
      expect(hasSafeLinkProtocol(uri)).toBe(false)
    },
  )

  it('allows relative references that carry no scheme', () => {
    expect(hasSafeLinkProtocol('/content/about')).toBe(true)
    expect(hasSafeLinkProtocol('#section')).toBe(true)
  })

  it('rejects a dangerous scheme hidden behind leading whitespace', () => {
    expect(hasSafeLinkProtocol(' javascript:alert(1)')).toBe(false)
    expect(hasSafeLinkProtocol('\t\ndata:text/html,x')).toBe(false)
  })

  it('rejects a dangerous scheme split by an embedded tab or newline', () => {
    expect(hasSafeLinkProtocol('java\tscript:alert(1)')).toBe(false)
    expect(hasSafeLinkProtocol('java\nscript:alert(1)')).toBe(false)
    expect(hasSafeLinkProtocol('ja\r\nva\tscript:alert(1)')).toBe(false)
  })
})

describe('buildSafeHref', () => {
  it('escapes an allowlisted URL for attribute use', () => {
    expect(buildSafeHref('https://example.com/x" onclick="y')).toBe(
      'https://example.com/x&quot; onclick=&quot;y',
    )
  })

  it('passes a relative reference through, escaped', () => {
    expect(buildSafeHref('/content/about')).toBe('/content/about')
  })

  it('collapses an unsafe scheme to the default fallback', () => {
    expect(buildSafeHref('javascript:alert(1)')).toBe('#')
  })

  it('uses a caller-provided fallback for an unsafe scheme', () => {
    expect(buildSafeHref('data:text/html,x', '/')).toBe('/')
  })
})
