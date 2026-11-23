import { describe, expect, it } from 'vitest'
import { ANALYTICS_MAX_PATH_LENGTH } from '@scayle/storefront/shared'
import {
  resolveTrackingDeviceType,
  resolveTrackingPageType,
  toTrackedPath,
  toTrackedUrl,
} from './tracking'

describe('resolveTrackingPageType', () => {
  // The `satisfies Record<PageComponentName, string>` constraint on
  // PageTypeSnakeCase keeps the map total at compile time, so one lookup
  // stands in for every entry.
  it('resolves a CMS page that is not the start page to cms_page', () => {
    expect(resolveTrackingPageType('CmsPage', false)).toBe('cms_page')
  })

  it('resolves the start page to homepage although it renders a CMS page', () => {
    expect(resolveTrackingPageType('CmsPage', true)).toBe('homepage')
  })
})

describe('resolveTrackingDeviceType', () => {
  it.each([
    [
      'ios',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    ],
    ['android', 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36'],
    [
      'desktop',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    ],
    ['desktop', ''],
  ])('classifies %s from the user agent %s', (deviceType, userAgent) => {
    expect(resolveTrackingDeviceType(userAgent)).toBe(deviceType)
  })
})

describe('toTrackedUrl', () => {
  const shop = 'https://shop.example/c/shoes-5'

  it.each([
    [
      'keeps pagination, sorting, the variant, the image view and the registration view',
      `${shop}?page=2&sort=price_asc&variantId=7&imageView=model&register=true`,
      `${shop}?page=2&sort=price_asc&variantId=7&imageView=model&register=true`,
    ],
    [
      'keeps the search term, range bounds and attribute filters',
      `${shop}?filters[term]=boots&filters[minPrice]=1000&filters[color]=5803&filters[size_eu]=42`,
      // cspell:disable-next-line -- encoded brackets tokenize as "Bmin", "Bcolor"
      `${shop}?filters%5Bterm%5D=boots&filters%5BminPrice%5D=1000&filters%5Bcolor%5D=5803&filters%5Bsize_eu%5D=42`,
    ],
    [
      'keeps the five utm keys and every click id',
      `${shop}?utm_source=a&utm_medium=b&utm_campaign=c&utm_content=d&utm_term=e&gclid=1&dclid=2&gbraid=3&wbraid=4&fbclid=5&msclkid=6&twclid=7&ttclid=8`,
      `${shop}?utm_source=a&utm_medium=b&utm_campaign=c&utm_content=d&utm_term=e&gclid=1&dclid=2&gbraid=3&wbraid=4&fbclid=5&msclkid=6&twclid=7&ttclid=8`,
    ],
    [
      'drops tokens, the redirect target and CMS preview keys',
      `${shop}?hash=secret&cbd=token&transactionId=t&redirectUrl=%2Fde%2Faccount&_storyblok=1&live_preview=x&page=2`,
      `${shop}?page=2`,
    ],
    [
      'keeps repeated allowed keys in order and drops repeated other keys',
      `${shop}?hash=1&filters[size]=36&page=2&hash=2&filters[size]=38`,
      // cspell:disable-next-line -- encoded brackets tokenize as "Bsize"
      `${shop}?filters%5Bsize%5D=36&page=2&filters%5Bsize%5D=38`,
    ],
    [
      'reports a space in a value as +',
      `${shop}?utm_campaign=summer%20sale`,
      `${shop}?utm_campaign=summer+sale`,
    ],
    ['leaves no question mark when no key survives', `${shop}?hash=x`, shop],
    [
      'clears a fragment that carries a credential',
      `${shop}?page=2#access_token=XYZ&state=1`,
      `${shop}?page=2`,
    ],
    ['clears an anchor fragment too', `${shop}#reviews`, shop],
    [
      'does not match a key that only contains an allowed name',
      `${shop}?x_page=1&page2=2&utm_custom=3&UTM_SOURCE=4&filters=5&filters[a.b]=6&my_filters[c]=7`,
      shop,
    ],
    ['leaves a plain URL unchanged', shop, shop],
  ])('%s', (_name, href, expected) => {
    expect(toTrackedUrl(href)).toBe(expected)
  })

  it('keeps an encoded separator inside its value instead of adding pairs', () => {
    // Regression: re-joining decoded values with raw `&` and `=` turned this
    // into `utm_source=a&hash=1&x=2`, three pairs.
    const result = toTrackedUrl(`${shop}?utm_source=a%26hash%3D1%26x%3D2`)

    expect(result).toBe(`${shop}?utm_source=a%26hash%3D1%26x%3D2`)
    expect([...new URL(result).searchParams]).toEqual([
      ['utm_source', 'a&hash=1&x=2'],
    ])
  })
})

describe('toTrackedPath', () => {
  it('appends the allowlisted query keys to the path', () => {
    expect(
      toTrackedPath(
        '/de/signin',
        new URLSearchParams('hash=secret&register=true'),
      ),
    ).toBe('/de/signin?register=true')
  })

  it('reports filter keys percent-encoded and a space as a plus', () => {
    expect(
      toTrackedPath(
        '/de/c/shoes-5',
        new URLSearchParams('filters[color]=5803&filters[term]=red shoes'),
      ),
      // cspell:disable-next-line -- encoded brackets tokenize as "Bcolor"
    ).toBe('/de/c/shoes-5?filters%5Bcolor%5D=5803&filters%5Bterm%5D=red+shoes')
  })

  it('returns the path alone when no query key is allowlisted', () => {
    expect(toTrackedPath('/de/checkout', new URLSearchParams('cbd=x'))).toBe(
      '/de/checkout',
    )
  })

  it('falls back to the path alone when the query would exceed the path cap', () => {
    const path = '/de/c/shoes-5'
    const query = new URLSearchParams({
      'filters[term]': 'a'.repeat(ANALYTICS_MAX_PATH_LENGTH),
    })

    expect(toTrackedPath(path, query)).toBe(path)
  })
})
