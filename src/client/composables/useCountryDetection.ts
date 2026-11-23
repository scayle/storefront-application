import { usePage } from '@client/composables/usePage'
import { useSessionStorage } from '@vueuse/core'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { AvailableLanguage } from '@scayle/storefront/types'

/** sessionStorage key set once the user has dismissed the country switch suggestion. */
export const PROMPTED_COUNTRY_SWITCH_KEY = 'hasPromptedCountrySwitch'

/** sessionStorage key set once the user has switched to a different shop. */
export const SWITCHED_SHOPS_KEY = 'hasSwitchedShops'

/**
 * Return type of {@link useCountryDetection}.
 *
 * Provides the server-detected shop suggestions, persistence helpers for dismissals
 * and manual switches, and reactive flags for prompt and switch history.
 */
export interface UseCountryDetectionReturn {
  /** Shops to suggest for the detected country. Empty until `shopSuggestion` resolves. */
  suggestedShops: ComputedRef<AvailableLanguage[]>
  /** Region code detected on the server (e.g. 'DE', 'US'); `undefined` while unresolved or with nothing to suggest. */
  detectedRegion: ComputedRef<string | undefined>
  /** Whether the suggestion UI should be shown (suggestions exist, no customer, not dismissed). */
  suggestionActive: ComputedRef<boolean>
  /** Mark the current session as having shown the country switch suggestion. */
  markUserAsPrompted: () => void
  /** Whether this session has already been prompted about a country switch. */
  hasPromptedUser: ComputedRef<boolean>
  /** Whether this session has already switched to a different shop. */
  hasSwitchedShops: ComputedRef<boolean>
  /** Mark the current session as having switched to a different shop. */
  markShopAsSwitched: () => void
}

/**
 * Suggests a better shop when the country detected for the request differs from the active shop.
 *
 * Detection happens on the server (`CountryService`, from `CF-IPCountry`) and arrives as the
 * deferred `shopSuggestion` shared prop with the suggestions already resolved. This composable
 * only applies the browser-side gates: a signed-in customer keeps their shop, and a dismissal or a
 * manual switch in this tab session suppresses the prompt. Uses session storage so those persist
 * for the tab session.
 *
 * @returns Reactive suggestion state and persistence helpers
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/localization/country-detection
 */
export function useCountryDetection(): UseCountryDetectionReturn {
  const page = usePage()

  const hasPromptedUser = useSessionStorage<boolean>(
    PROMPTED_COUNTRY_SWITCH_KEY,
    false,
    {
      serializer: {
        read: (value) => (value ? (JSON.parse(value) as boolean) : false),
        write: (value) => JSON.stringify(value),
      },
    },
  )

  const hasSwitchedShops = useSessionStorage<boolean>(
    SWITCHED_SHOPS_KEY,
    false,
    {
      serializer: {
        read: (value) => (value ? (JSON.parse(value) as boolean) : false),
        write: (value) => JSON.stringify(value),
      },
    },
  )

  const markUserAsPrompted = () => {
    hasPromptedUser.value = true
  }

  const markShopAsSwitched = () => {
    hasSwitchedShops.value = true
  }

  const suggestedShops = computed(
    () => page.props.shopSuggestion?.languages ?? [],
  )
  const detectedRegion = computed(() => page.props.shopSuggestion?.region)

  // `customer === null` is the resolved signed-out state. While the deferred
  // `customer` prop is still loading it is `undefined`, and treating that as
  // signed out would open the prompt for customers whose account holds their
  // shop preference.
  const suggestionActive = computed(
    () =>
      suggestedShops.value.length > 0 &&
      page.props.customer === null &&
      !hasPromptedUser.value &&
      !hasSwitchedShops.value,
  )

  return {
    hasPromptedUser: computed(() => hasPromptedUser.value),
    hasSwitchedShops: computed(() => hasSwitchedShops.value),
    suggestedShops,
    suggestionActive,
    detectedRegion,
    markUserAsPrompted,
    markShopAsSwitched,
  }
}
