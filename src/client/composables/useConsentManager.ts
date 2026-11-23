import { inject } from 'vue'
import { CONSENT_MANAGER_INJECTION_KEY } from '@client/plugins/consentManager'
import type { ConsentManagerPlugin } from '@client/plugins/consentManager'

/**
 * Provides access to the consent manager state and methods.
 *
 * Returns the consent state and openConsentManager function. The consent state
 * is a reactive record where keys are vendor IDs and values indicate whether
 * the user has given consent for that vendor.
 *
 * Requires the consentManager plugin to be installed on the app.
 *
 * @returns Object containing the consent state and openConsentManager function
 * @throws Error when consent manager plugin is not installed
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const consent = useConsentManager()
 *
 * // Check if a specific vendor has consent
 * const hasAnalyticsConsent = computed(() => consent.state['analytics'])
 *
 * // Open the consent manager UI
 * const openPrivacySettings = () => {
 *   consent.openConsentManager()
 * }
 * </script>
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/consent-management
 */
export function useConsentManager(): ConsentManagerPlugin {
  const consentManager = inject(CONSENT_MANAGER_INJECTION_KEY)

  if (!consentManager) {
    throw new Error('Consent manager plugin not installed')
  }

  return consentManager
}
