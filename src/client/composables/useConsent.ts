import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import consentVendorConfig from '@client/consent-vendor.config.json' with { type: 'json' }
import { createLogger } from '@scayle/storefront/shared'
import { useConsentManager } from './useConsentManager'

const log = createLogger('consent')

/**
 * Type definition for consent vendor keys from the consent vendor configuration.
 */
type ConsentVendorKey = keyof typeof consentVendorConfig

/**
 * Return type for the useConsent composable.
 */
interface UseConsentReturn {
  /**
   * The consent state is a boolean indicating if the user has given consent
   * for the consent vendor.
   */
  consent: ComputedRef<boolean>
  /**
   * Opens the consent manager UI.
   */
  openConsentManager: () => Promise<void>
}

/**
 * Checks whether the user has given consent for a specific third-party vendor.
 *
 * When the active country does not require consent management, `consent` is always `true`.
 * When consent management is required, `consent` reflects the vendor's state from the
 * installed CMP adapter (e.g. `userCentricsAdapter`). If the vendor has no recorded
 * consent entry, `consent` defaults to `false`.
 *
 * @param vendor Key from `consent-vendor.config.json` identifying the third-party vendor.
 * @returns Object with a reactive `consent` computed ref and an `openConsentManager` function.
 * @throws Error when the `consentManager` plugin is not installed on the Vue app.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { consent, openConsentManager } = useConsent('google-analytics')
 *
 * watchEffect(() => {
 *   if (consent.value) {
 *     initAnalytics()
 *   }
 * })
 * </script>
 *
 * <template>
 *   <button @click="openConsentManager">Manage privacy settings</button>
 * </template>
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/consent-management
 */
export function useConsent(vendor: ConsentVendorKey): UseConsentReturn {
  const consentManager = useConsentManager()

  if (!consentManager.consentManagementRequired) {
    return {
      consent: computed(() => true),
      openConsentManager: () => Promise.resolve(),
    }
  }

  if (!(vendor in consentVendorConfig)) {
    log.warn({ message: 'Consent vendor not configured', vendor })
  }

  const vendorId = consentVendorConfig[vendor]

  return {
    consent: computed(() => {
      return consentManager.state[vendorId] ?? false
    }),
    // Stays `async` for the `Promise<void>` contract: an adapter that throws
    // synchronously has to reject instead.
    // eslint-disable-next-line @typescript-eslint/require-await
    openConsentManager: async () => {
      consentManager.openConsentManager()
    },
  }
}
