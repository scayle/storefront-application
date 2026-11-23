import { describe, expect, it } from 'vitest'
import {
  createMockStorefrontContext,
  createMockStorefrontCountry,
} from '../../test/utils/context'
import { buildCmsHreflangs, mapCmsPageMeta } from './seo'

describe('mapCmsPageMeta', () => {
  const defaults = {
    shopName: 'Test Shop',
    pageUrl: 'https://shop.example.com/en/content/about',
  }

  it('maps CMS meta to SEOMeta passing through provider title, description, and robots', () => {
    const result = mapCmsPageMeta({
      ...defaults,
      cmsMeta: {
        title: 'About Us',
        description: 'About description',
        robots: 'index, follow',
      },
    })

    expect(result).toEqual({
      title: 'About Us',
      description: 'About description',
      robots: 'index, follow',
      canonicalLink: {
        rel: 'canonical',
        key: 'canonical',
        href: 'https://shop.example.com/en/content/about',
      },
    })
  })

  it('passes cmsMeta image through for Open Graph', () => {
    const result = mapCmsPageMeta({
      ...defaults,
      cmsMeta: {
        title: 'About Us',
        description: 'About description',
        image: 'https://cdn.example.com/cms-og.jpg',
      },
    })

    expect(result.image).toBe('https://cdn.example.com/cms-og.jpg')
  })

  it.for([
    {
      case: 'falls back to the shop name when there is no CMS meta',
      cmsMeta: undefined,
      shopName: 'Test Shop',
      expected: 'Test Shop',
    },
    {
      case: 'falls back to the shop name when the CMS title is empty',
      cmsMeta: { title: '', description: 'd' },
      shopName: 'Test Shop',
      expected: 'Test Shop',
    },
    {
      case: 'leaves the title empty when neither the CMS entry nor the shop configuration has one',
      cmsMeta: undefined,
      shopName: undefined,
      expected: '',
    },
  ])('$case', ({ cmsMeta, shopName, expected }) => {
    const result = mapCmsPageMeta({ ...defaults, shopName, cmsMeta })

    expect(result.title).toBe(expected)
  })

  it('leaves the description unset when there is no CMS meta', () => {
    const result = mapCmsPageMeta({ ...defaults, cmsMeta: undefined })

    expect(result.description).toBeUndefined()
  })

  it('omits robots when cmsMeta does not provide it', () => {
    const result = mapCmsPageMeta({ ...defaults, cmsMeta: undefined })

    expect(result).not.toHaveProperty('robots')
  })

  it('passes through cmsMeta.robots when provided', () => {
    const result = mapCmsPageMeta({
      ...defaults,
      cmsMeta: { robots: 'noindex, nofollow' },
    })

    expect(result.robots).toBe('noindex, nofollow')
  })

  it('strips query parameters from the canonical URL', () => {
    const result = mapCmsPageMeta({
      ...defaults,
      pageUrl:
        'https://shop.example.com/en/content/about?utm_source=test&ref=abc',
      cmsMeta: { title: 'About' },
    })

    expect(result.canonicalLink).toEqual({
      rel: 'canonical',
      key: 'canonical',
      href: 'https://shop.example.com/en/content/about',
    })
  })
})

describe('buildCmsHreflangs', () => {
  const germany = createMockStorefrontCountry({
    locale: 'de-DE',
    shopCountryId: 1,
    countryCode: 'DE',
    path: 'de',
    isDefault: true,
  })
  const britain = createMockStorefrontCountry({
    locale: 'en-GB',
    shopCountryId: 2,
    countryCode: 'GB',
    path: 'en',
  })
  const austria = createMockStorefrontCountry({
    locale: 'de-AT',
    shopCountryId: 3,
    countryCode: 'AT',
    path: 'at',
  })

  const buildStorefront = (countries = [germany, britain]) =>
    createMockStorefrontContext({ config: { countries } })

  // The emission rule (one alternate per country, x-default on the default
  // country, path_except_default) belongs to the SDK `composeHreflangs`; this
  // checks once that buildCmsHreflangs hands its countries through to it.
  it('generates one hreflang per country plus x-default for the default country', () => {
    const result = buildCmsHreflangs({
      pagePath: '/',
      storefront: buildStorefront(),
      origin: 'https://shop.example.com',
    })

    expect(result).toEqual([
      {
        rel: 'alternate',
        hreflang: 'de-DE',
        href: 'https://shop.example.com/de',
      },
      {
        rel: 'alternate',
        hreflang: 'x-default',
        href: 'https://shop.example.com/de',
      },
      {
        rel: 'alternate',
        hreflang: 'en-GB',
        href: 'https://shop.example.com/en',
      },
    ])
  })

  it('prefixes the content page path with each country path', () => {
    const result = buildCmsHreflangs({
      pagePath: '/content/about',
      storefront: buildStorefront(),
      origin: 'https://shop.example.com',
    })

    expect(result).toContainEqual({
      rel: 'alternate',
      hreflang: 'de-DE',
      href: 'https://shop.example.com/de/content/about',
    })
    expect(result).toContainEqual({
      rel: 'alternate',
      hreflang: 'en-GB',
      href: 'https://shop.example.com/en/content/about',
    })
  })

  it.for<{
    case: string
    countries: (typeof germany)[]
    alternatePagePaths: Record<string, string>
    expected: Record<string, string>
  }>([
    {
      case: 'uses a language-code key per country',
      countries: [germany, britain],
      alternatePagePaths: { de: '/content/ueber-uns', en: '/content/about-us' },
      expected: {
        'de-DE': 'https://shop.example.com/de/content/ueber-uns',
        'en-GB': 'https://shop.example.com/en/content/about-us',
      },
    },
    {
      case: 'falls back to pagePath for a country without an entry',
      countries: [germany, britain],
      alternatePagePaths: { de: '/content/ueber-uns' },
      expected: {
        'de-DE': 'https://shop.example.com/de/content/ueber-uns',
        'en-GB': 'https://shop.example.com/en/content/about',
      },
    },
    {
      case: 'prefers a full-locale key when country.path diverges from the language',
      countries: [germany, austria],
      alternatePagePaths: {
        'de-DE': '/content/ueber-uns',
        'de-AT': '/content/ueber-uns-oesterreich',
      },
      expected: {
        'de-DE': 'https://shop.example.com/de/content/ueber-uns',
        'de-AT': 'https://shop.example.com/at/content/ueber-uns-oesterreich',
      },
    },
    {
      case: 'falls back to the language code when there is no full-locale key',
      countries: [austria],
      alternatePagePaths: { de: '/content/ueber-uns' },
      expected: {
        'de-AT': 'https://shop.example.com/at/content/ueber-uns',
      },
    },
    {
      case: 'prefers the full-locale key over a coexisting language-code key',
      countries: [germany, austria],
      alternatePagePaths: {
        de: '/content/ueber-uns',
        'de-AT': '/content/ueber-uns-oesterreich',
      },
      expected: {
        'de-AT': 'https://shop.example.com/at/content/ueber-uns-oesterreich',
      },
    },
    {
      case: 'falls back to a country.path key when neither the locale nor the language code matches',
      countries: [austria],
      alternatePagePaths: { at: '/content/ueber-uns-oesterreich' },
      expected: {
        'de-AT': 'https://shop.example.com/at/content/ueber-uns-oesterreich',
      },
    },
  ])('$case', ({ countries, alternatePagePaths, expected }) => {
    const result = buildCmsHreflangs({
      pagePath: '/content/about',
      storefront: buildStorefront(countries),
      origin: 'https://shop.example.com',
      alternatePagePaths,
    })

    for (const [hreflang, href] of Object.entries(expected)) {
      expect(result).toContainEqual({ rel: 'alternate', hreflang, href })
    }
  })
})
