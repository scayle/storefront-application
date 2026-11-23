import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type { StorefrontCountry } from '@scayle/storefront/config'
import type {
  AvailableCountry,
  AvailableLanguage,
} from '@scayle/storefront/types'
import { useShopSwitcher } from './useShopSwitcher'

const hoisted = vi.hoisted(() => {
  function stubShop(
    locale: string,
    countryCode: string,
    path: string,
  ): StorefrontCountry {
    return {
      name: locale,
      locale,
      currency: { currencyCode: 'EUR' },
      countryCode,
      shopCountryId: 1,
      path,
    } as StorefrontCountry
  }

  const defaultCountries = [
    stubShop('de-DE', 'DE', '/de-de'),
    stubShop('en-DE', 'DE', '/en-de'),
    stubShop('en-US', 'US', '/en-us'),
  ]
  const defaultCountry = {
    locale: 'de-DE',
    countryCode: 'DE',
    path: '/de-de',
  }
  return { defaultCountries, defaultCountry, stubShop }
})

const mocks = vi.hoisted(() => ({
  reactivePage: null as {
    props: {
      storefront: {
        country: Record<string, unknown>
      }
      availableLanguages: AvailableLanguage[]
      availableCountries: AvailableCountry[]
    }
  } | null,
}))

const countryDetectionMocks = vi.hoisted(() => ({
  markShopAsSwitched: vi.fn(),
}))

vi.mock('./useCountryDetection', () => ({
  useCountryDetection: () => ({
    markShopAsSwitched: countryDetectionMocks.markShopAsSwitched,
    isCountryDetectionEnabled: { value: false },
    suggestionActive: { value: false },
    suggestedShops: { value: [] },
    detectedRegion: { value: undefined },
    markUserAsPrompted: vi.fn(),
  }),
}))

vi.mock('@inertiajs/vue3', () => {
  mocks.reactivePage = reactive({
    props: {
      storefront: {
        country: { ...hoisted.defaultCountry },
      },
      availableLanguages: [],
      availableCountries: [],
    },
  })
  return {
    usePage: vi.fn(() => mocks.reactivePage),
  }
})

beforeEach(() => {
  mocks.reactivePage!.props.storefront.country = { ...hoisted.defaultCountry }
  mocks.reactivePage!.props.availableLanguages = []
  mocks.reactivePage!.props.availableCountries = []
})

const germanRegionLanguages = [
  {
    ...hoisted.defaultCountries[0]!,
    url: 'https://de.example.com',
    code: 'de',
    name: 'Deutsch',
  },
  {
    ...hoisted.defaultCountries[1]!,
    url: 'https://en.example.com',
    code: 'en',
    name: 'English',
  },
]

describe('useShopSwitcher', () => {
  it('exposes currentLocale for the active country', () => {
    const { currentLocale } = useShopSwitcher()

    expect(currentLocale.value?.language).toBe('de')
    expect(currentLocale.value?.region).toBe('DE')
  })

  it('returns the localized labels for the active locale', () => {
    const { selectedLanguage, selectedCountry } = useShopSwitcher()

    // `Intl.DisplayNames` for the de-DE locale names both parts of it.
    expect(selectedLanguage.value).toBe('Deutsch')
    expect(selectedCountry.value).toBe('Deutschland')
  })

  it('appends language code to shopName when multiple shops share a region', () => {
    mocks.reactivePage!.props.availableLanguages = germanRegionLanguages
    const { shopName } = useShopSwitcher()

    expect(shopName.value).toMatch(/\|/)
    expect(shopName.value).toContain('DE')
  })

  it('marks the shop as switched on link click', () => {
    const { onShopLinkClick } = useShopSwitcher()
    onShopLinkClick()

    expect(countryDetectionMocks.markShopAsSwitched).toHaveBeenCalledTimes(1)
  })

  describe('hasOtherShops', () => {
    const language = (locale: string) => ({
      code: new Intl.Locale(locale).language,
      name: locale,
      locale,
      url: `https://example.com/${locale}`,
    })

    it.for([
      {
        name: 'a single shop',
        countries: [
          { name: 'Deutschland', code: 'DE', languages: [language('de-DE')] },
        ],
        expected: false,
      },
      {
        name: 'several languages in one country',
        countries: [
          {
            name: 'Deutschland',
            code: 'DE',
            languages: [language('de-DE'), language('en-DE')],
          },
        ],
        expected: true,
      },
      {
        name: 'one language in each of several countries',
        countries: [
          { name: 'Deutschland', code: 'DE', languages: [language('de-DE')] },
          { name: 'Österreich', code: 'AT', languages: [language('de-AT')] },
        ],
        expected: true,
      },
    ])('is $expected for $name', ({ countries, expected }) => {
      mocks.reactivePage!.props.availableCountries = countries
      const { hasOtherShops } = useShopSwitcher()

      expect(hasOtherShops.value).toBe(expected)
    })
  })

  it('omits region suffix in shopName when each region has a single shop', () => {
    mocks.reactivePage!.props.availableLanguages = [
      {
        ...hoisted.defaultCountries[0]!,
        url: 'https://de.example.com',
        code: 'de',
        name: 'Deutsch',
      },
    ]
    const { shopName } = useShopSwitcher()

    expect(shopName.value).toBeTruthy()
    expect(shopName.value).not.toMatch(/\|/)
  })
})
