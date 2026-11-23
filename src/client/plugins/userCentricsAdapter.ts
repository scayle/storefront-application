import { useEventListener } from '@vueuse/core'
import { createLogger } from '@scayle/storefront/shared'
import type { App } from 'vue'
import { getConsentManagerInstance } from './consentManager'

const log = createLogger('usercentrics')

/**
 * A single data processing service as reported by Usercentrics in the `UC_CONSENT` event.
 * Represents one third-party vendor and its current consent state.
 */
export interface DataProcessingService {
  /** Service name as configured in the Usercentrics dashboard. */
  name: string
  /** Service version as configured in the Usercentrics dashboard. */
  version: string
  /** Category the service belongs to (e.g. "Marketing", "Analytics"). */
  category: string
  /** Whether this service is essential and cannot be declined by the user. */
  essential: boolean
  /** Google Consent Mode (GCM) signals for this service. */
  gcm: {
    /** Whether ad storage is permitted under Google Consent Mode. */
    adStorage: boolean
  }
  /** Consent information for this service. */
  consent: {
    /** Whether the user has given consent for this service. */
    given: boolean
    /** Consent type as reported by Usercentrics (e.g. `"explicit"`, `"implicit"`). */
    type: string
  }
}

/**
 * Describes the visitor's consent record as reported by Usercentrics in the `UC_CONSENT` event.
 * The adapter copies `controllerId` onto the consent manager as `consentId`.
 */
export interface UsercentricsConsentDetail {
  /** Domains that the consent record applies to. */
  domains?: undefined
  /** Latest Usercentrics UI version known to the CMP. */
  _latestUiVersion?: string
  /**
   * Usercentrics-generated identifier for the current visitor.
   * Copied onto the consent manager as `consentId` and used as tracking `consent_id`.
   */
  controllerId: string
  /** Unix timestamp when this consent record was created. */
  createdAt: number
  /**
   * Whether this event was produced by the visitor interacting with the CMP,
   * rather than a restored session or initial page load.
   */
  fromUserAction: boolean
  /** Whether the browser sent a Global Privacy Control (GPC) signal. */
  gpcSignal: boolean
  /** Hash of the current consent choices. Changes when the visitor updates their preferences. */
  hash: string
  /** Interaction that produced this consent record, as reported by the CMP. */
  interaction: string
  /** Set when Usercentrics classified the visitor as a bot. Absent in normal browser sessions. */
  isBot?: undefined
  /** Language of the CMP UI when consent was collected. */
  language: string
  /** Whether consent is required under the active Usercentrics settings. */
  required: boolean
  /** Usercentrics service IDs this consent record applies to. */
  serviceIds: string[]
  /** Usercentrics settings this consent was collected against. */
  setting: {
    /** Legal framework of the settings (e.g. `"GDPR"`, `"TCF"`, `"CCPA"`). */
    type: string
    /** Settings ID from the Usercentrics Admin Interface. */
    id: string
    /** Version of the settings configuration. */
    version: string
  }
  /** Overall consent status */
  status: 'ALL_ACCEPTED' | 'ALL_DENIED' | 'SOME_ACCEPTED' | 'SOME_DENIED'
  /** Consent type as reported by Usercentrics (e.g. `"EXPLICIT"`, `"IMPLICIT"`). */
  type: string
  /** Version of the Usercentrics UI that collected this consent. */
  uiVersion: string
  /** Unix timestamp when this consent record was last updated. */
  updatedAt: number
  /**
   * Action that last updated this consent
   * (e.g. `"onAcceptAllServices"`, `"onInitialPageLoad"`).
   */
  updatedBy: string
  /** Consent record version as reported by Usercentrics. */
  version: number
}

/**
 * Custom DOM event emitted by Usercentrics when the user's consent choices change.
 * Listen for this event via `useEventListener('UC_CONSENT', handler)`.
 */
export interface UsercentricsConsentEvent {
  detail: {
    /** Map of Usercentrics service IDs to their current consent state. */
    services: Record<string, DataProcessingService>
    /** Visitor consent record. See {@link UsercentricsConsentDetail}. */
    consent: UsercentricsConsentDetail
  }
}

declare global {
  interface WindowEventMap {
    UC_CONSENT: UsercentricsConsentEvent
  }

  interface Window {
    UC_UI: {
      showFirstLayer: () => Promise<void>
      /** Returns the Usercentrics controller id for the current visitor. */
      getControllerId?: () => string
    }
    /**
     * The Usercentrics Web CMP v3 API object. Absent until the loader script
     * has run, and its methods are only reliable once `isInitialized()` is
     * true.
     */
    __ucCmp?: {
      /** Whether the CMP has loaded and applied the visitor's stored consent. */
      isInitialized: () => boolean | Promise<boolean>
      /** Returns the consent record `UC_CONSENT` would carry, without waiting for the event. */
      getConsentDetails: () => Promise<UsercentricsConsentEvent['detail']>
    }
  }
}

/**
 * Creates a Vue plugin that connects Usercentrics to the storefront consent manager.
 *
 * Listens to the Usercentrics `UC_CONSENT` DOM event and maps each service's consent state
 * into the consent manager's reactive `state`. Also overrides `openConsentManager` to call
 * `window.UC_UI.showFirstLayer()`.
 *
 * While Usercentrics is still loading the plugin holds `cmpPending` on the consent manager,
 * which is what lets SCAYLE Analytics queue events instead of dropping them. The first
 * `UC_CONSENT` clears the flag: Usercentrics dispatches one as soon as it initializes, for a
 * returning visitor with a stored decision and for a first-time visitor alike, so the event is
 * the report and no separate initialization marker is needed. When the CMP initialized before
 * this plugin installed, that first event is already gone, and the plugin reads the same record
 * back through `window.__ucCmp.getConsentDetails()` instead.
 *
 * Install `createConsentManagerPlugin` before this plugin. If `consentManagementRequired`
 * is `false` on the consent manager instance, this plugin is a no-op.
 *
 * @note Client-side only. Register in `main.ts`, not in `ssr.ts`.
 * @throws Error when `createConsentManagerPlugin` has not been installed before this plugin.
 *
 * @returns A Vue plugin.
 *
 * @example
 * ```ts
 * // main.ts (client only)
 * import { createConsentManagerPlugin } from '@client/plugins/consentManager'
 * import { createUserCentricsAdapterPlugin } from '@client/plugins/userCentricsAdapter'
 *
 * createSSRApp({ render: () => h(App, props) })
 *   .use(createConsentManagerPlugin(), {
 *     consentManagementRequired: pageProps.storefront.country.publicFields?.consentManagementRequired ?? false,
 *   })
 *   .use(createUserCentricsAdapterPlugin())
 *   .mount(el)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/consent-management
 */
export function createUserCentricsAdapterPlugin(): {
  install: (app: App) => void
} {
  return {
    install(_app: App) {
      const consentManager = getConsentManagerInstance()

      if (!consentManager) {
        throw new Error(
          'Consent manager plugin not found. ' +
            'Make sure to install createConsentManagerPlugin before userCentricsAdapter.',
        )
      }

      if (!consentManager.consentManagementRequired) {
        return
      }

      consentManager.cmpPending.value = true

      const applyReport = (report: UsercentricsConsentEvent['detail']) => {
        Object.entries(report.services).forEach(([vendorId, dps]) => {
          consentManager.state[vendorId] = dps.consent.given
        })
        // Same tick as the vendor writes above, and before the flag clears:
        // the flush the flag triggers reads all three.
        consentManager.consentId.value = report.consent.controllerId
        consentManager.cmpPending.value = false
      }

      useEventListener('UC_CONSENT', (event: UsercentricsConsentEvent) => {
        applyReport(event.detail)
      })

      // Usercentrics fires the initial `UC_CONSENT` once, when it initializes.
      // When that happened before the Vue app hydrated, the listener above
      // never sees it and the flag would hold events until the cap. The
      // stored record is read back instead. `isInitialized()` is documented
      // as returning a promise but the reference guard calls it synchronously,
      // so both are accepted.
      const cmp = window.__ucCmp
      if (cmp) {
        Promise.resolve(cmp.isInitialized())
          .then((initialized) =>
            initialized ? cmp.getConsentDetails() : undefined,
          )
          .then((report) => {
            if (report) {
              applyReport(report)
            }
            return report
          })
          .catch((error: unknown) => {
            log.debug({
              message: 'Reading the stored Usercentrics consent failed',
              error,
            })
          })
      }

      // Override the openConsentManager function
      consentManager.openConsentManager = () => {
        if (!window.UC_UI) {
          log.error({ message: 'Usercentrics is not available' })
          return
        }
        void window.UC_UI.showFirstLayer()
      }
    },
  }
}
