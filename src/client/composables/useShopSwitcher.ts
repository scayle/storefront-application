import { usePage } from '@client/composables/usePage'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type {
  AvailableCountry,
  AvailableLanguage,
} from '@scayle/storefront/types'
import { useCountryDetection } from './useCountryDetection'

interface UseShopSwitcherReturn {
  /**
   * The current locale as an Intl.Locale instance.
   */
  currentLocale: ComputedRef<Intl.Locale>
  /**
   * List of available languages for the current region.
   */
  availableLanguages: ComputedRef<AvailableLanguage[]>
  /**
   * List of available countries.
   */
  availableCountries: ComputedRef<AvailableCountry[]>
  /**
   * Whether the Storefront has more than one shop across all countries and languages.
   * False when the only shop is the current one, so there is nothing to switch to.
   */
  hasOtherShops: ComputedRef<boolean>
  /**
   * The translated language name for the current locale, or undefined if no language code.
   */
  selectedLanguage: ComputedRef<string | undefined>
  /**
   * The translated region/country name for the current locale, or undefined if no region code.
   */
  selectedCountry: ComputedRef<string | undefined>
  /**
   * Translated region name, optionally with language code. Returns undefined if no region code.
   */
  shopName: ComputedRef<string | undefined>
  /**
   * Fires tracking event and persistence side-effects for shop switch before navigation.
   */
  onShopLinkClick: () => void
}

/**
 * Supplies shop switcher state from Inertia `storefront` props: current locale, grouped countries,
 * language options for the current region, and display labels for the header trigger.
 * Used in `SFShopSwitcher` and `SFShopSwitcherFlyoutBody`.
 *
 * @returns Computed refs for locale, lists, and labels. Lists are empty when `country.locale` is
 *   missing. Translators follow the current shop locale for consistent region and language names.
 *
 * @example
 * ```ts
 * const { availableCountries, shopName, currentLocale } = useShopSwitcher()
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/routing
 */
export function useShopSwitcher(): UseShopSwitcherReturn {
  const page = usePage()
  const { markShopAsSwitched } = useCountryDetection()

  const currentCountry = computed(() => page.props.storefront.country)

  const availableLanguages = computed(() => page.props.availableLanguages)
  const availableCountries = computed(() => page.props.availableCountries)

  const hasOtherShops = computed(
    () =>
      availableCountries.value.reduce(
        (count, country) => count + country.languages.length,
        0,
      ) > 1,
  )

  const currentLocale = computed(() => {
    return new Intl.Locale(currentCountry.value.locale)
  })

  const regionTranslator = computed(() => {
    return new Intl.DisplayNames([currentCountry.value.locale], {
      type: 'region',
    })
  })

  const languageTranslator = computed(() => {
    return new Intl.DisplayNames([currentCountry.value.locale], {
      type: 'language',
    })
  })

  const selectedLanguage = computed(() => {
    const code = currentLocale.value.language
    if (!code) {
      return
    }
    return languageTranslator.value.of(code)
  })

  const selectedCountry = computed(() => {
    const code = currentLocale.value.region
    if (!code) {
      return
    }
    return regionTranslator.value.of(code)
  })

  const shopName = computed(() => {
    const code = currentLocale.value.region

    if (!code) {
      return
    }

    const region = regionTranslator.value.of(code)

    if (availableLanguages.value.length > 1) {
      return `${region} | ${currentLocale.value.language.toUpperCase()}`
    }
    return region
  })

  /**
   * Applies persistence side-effects for a shop switch just before the browser
   * follows the native `<a href>` to the new shop. The call is synchronous; the
   * navigation that follows is the link's default behavior (no
   * `event.preventDefault()`).
   */
  const onShopLinkClick = () => {
    markShopAsSwitched()
  }

  return {
    currentLocale,
    availableLanguages,
    availableCountries,
    hasOtherShops,
    selectedLanguage,
    selectedCountry,
    shopName,
    onShopLinkClick,
  }
}
