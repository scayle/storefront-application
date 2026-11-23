import type { App, InjectionKey, Reactive, Ref } from 'vue'
import { createLogger } from '@scayle/storefront/shared'
import { reactive, ref } from 'vue'

const log = createLogger('consent')

/**
 * Consent state record where the key is the consent vendor id and the value
 * indicates if the user has given consent for that vendor.
 */
export type ConsentState = Record<string, boolean>

/**
 * Consent manager plugin interface.
 * Provides reactive consent state and the ability to open the consent manager UI.
 * Use `useConsentManager()` to access this in components and composables.
 */
export interface ConsentManagerPlugin {
  /** Reactive consent state keyed by vendor ID. Values are `true` when consent is given. */
  state: Reactive<ConsentState>
  /** Opens the consent manager UI so the user can review or change their consent choices. */
  openConsentManager: () => void
  /** Whether consent management is required for the active country. */
  readonly consentManagementRequired: boolean
  /**
   * Consent-framework identifier, populated by the CMP adapter once available.
   *
   * Write it in the same reactive tick as the last `state` write. SCAYLE
   * Analytics reads it as the end of the CMP report, so a vendor granted one
   * tick before the id arrives reads as a grant that will never carry one and
   * warns in the browser console.
   */
  consentId: Ref<string | undefined>
  /**
   * Whether the consent management platform is still loading and has not yet
   * reported what it knows.
   *
   * A CMP adapter sets it while its platform boots and clears it with the
   * first report, granting or not, in the same tick as the state that report
   * carries. SCAYLE Analytics holds events captured while it
   * is `true` and sends or discards them once it clears, rather than dropping
   * them on the spot: before the first report, a returning user whose decision
   * the platform already stored is indistinguishable from one who declined.
   *
   * An adapter whose platform reports after the app mounts has to set it. It
   * defaults to `false`, which reads as a report without consent, and the first
   * `view_page` fires when Inertia assigns the first page: without the flag,
   * that landing `view_page` is dropped on every page load.
   */
  cmpPending: Ref<boolean>
}

/** Injection key for the consent manager plugin. Use with inject() in components. */
export const CONSENT_MANAGER_INJECTION_KEY: InjectionKey<ConsentManagerPlugin> =
  Symbol('consentManager')

/** Reference to the consent manager plugin instance for inter-plugin communication. */
let consentManagerInstance: ConsentManagerPlugin | null = null

/**
 * Returns the consent manager plugin instance.
 * Used by adapter plugins (e.g. `userCentricsAdapter`) to read and update the consent state,
 * and by plugins that gate their own behavior on it (e.g. `analytics`).
 *
 * @returns The plugin instance, or `null` if `createConsentManagerPlugin` has not been installed yet.
 */
export function getConsentManagerInstance(): ConsentManagerPlugin | null {
  return consentManagerInstance
}

interface ConsentManagerPluginOptions {
  consentManagementRequired: boolean
}

/**
 * Creates a Vue plugin that provides consent management state to the app via `app.provide()`.
 *
 * Install this plugin before any CMP adapter (e.g. `userCentricsAdapter`). The adapter connects
 * to this plugin via `getConsentManagerInstance()` and sets the real consent state and
 * `openConsentManager` implementation. In components and composables, access the state with
 * `useConsentManager()`.
 *
 * @returns A Vue plugin. Pass `{ consentManagementRequired }` as the second argument to `.use()`.
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
 *
 * @example
 * ```ts
 * // Writing a custom CMP adapter
 * import { getConsentManagerInstance } from '@client/plugins/consentManager'
 *
 * install(app: App) {
 *   const consentManager = getConsentManagerInstance()
 *   if (!consentManager) return
 *   consentManager.openConsentManager = () => {
 *     // open your CMP UI
 *   }
 *   // Hold events until the platform has reported, see `cmpPending`.
 *   consentManager.cmpPending.value = true
 *   // Clear the flag only from a callback that carries the consent state.
 *   // A bare "ready" hook that fires before the state is applied would
 *   // release the held events against an empty state, which drops them.
 *   yourCmp.onConsent((consent) => {
 *     for (const [vendorId, given] of Object.entries(consent.vendors)) {
 *       consentManager.state[vendorId] = given
 *     }
 *     // Same tick as the vendor writes above, see `consentId` on ConsentManagerPlugin.
 *     consentManager.consentId.value = consent.id
 *     consentManager.cmpPending.value = false
 *   })
 * }
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/consent-management
 */
export function createConsentManagerPlugin(): {
  install: (app: App, options: ConsentManagerPluginOptions) => void
} {
  return {
    install(
      app: App,
      { consentManagementRequired }: ConsentManagerPluginOptions,
    ) {
      const state = reactive<ConsentState>({})

      const consentId = ref<string | undefined>(undefined)

      const cmpPending = ref(false)

      const plugin: ConsentManagerPlugin = {
        state,
        openConsentManager: () => {
          log.debug({ message: 'No consent manager is available' })
        },
        consentManagementRequired,
        consentId,
        cmpPending,
      }

      // Store reference for adapter plugins
      consentManagerInstance = plugin

      app.provide(CONSENT_MANAGER_INJECTION_KEY, plugin)
    },
  }
}
