import { onMounted } from 'vue'
import { getCheckoutOrigin } from '@scayle/storefront/shared'
import { useStorefrontConfig } from './useStorefrontConfig'

const SCRIPT_MARKER_ATTR = 'data-checkout-web-component-script'

/**
 * Mounts the SCAYLE Checkout web component script once into `document.head`.
 *
 * The script is appended imperatively (outside of Inertia's `<Head>` head
 * manager) so it survives every page navigation. Mounting it via per-page
 * `<Head>` declarations is fragile: Inertia adds and removes the `<script>`
 * element on navigations that change the head, and the checkout-wc script's
 * initializer relies on `document.currentScript.parentNode.insertBefore(…)`
 * — when the script element is detached mid-execution (which Inertia can
 * trigger during chained navigations like forced auth redirects), that
 * reference is `null` and the script crashes, taking the Inertia page
 * update with it.
 *
 * Idempotent: subsequent invocations check for the marker attribute and
 * bail. Call from components/pages that render a SCAYLE checkout or auth
 * web component (`SignIn.vue`, `Checkout.vue`, `SFExpressCheckoutBase.vue`);
 * the tag persists in `document.head` for the rest of the session.
 *
 * The tag deliberately carries no `fetchpriority="high"`. On `Basket` and
 * `ProductDetail` the LCP element is a product image, and the hint made this
 * script — which pulls the Adyen, Klarna and PayPal SDKs — bid against that
 * image for bandwidth in the early load window. `SignIn` and `Checkout` gain
 * nothing from the hint either: the tag is appended from `onMounted`, well after
 * the early load window a hint applies to. (On `SignIn` the largest element is
 * the consent banner text, not the web component.)
 *
 * All four pages instead get a `preconnect` to this origin from their layout
 * (`Layout.vue`, or `SimpleLayout.vue` for `Checkout`), which recovers the
 * handshake latency without competing for bandwidth. This block is the
 * canonical explanation; the layouts and the subscription composable point
 * back here rather than restating it.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/checkout
 */
export function useCheckoutWebComponentScript(): void {
  const { config } = useStorefrontConfig()

  onMounted(() => {
    if (document.querySelector(`script[${SCRIPT_MARKER_ATTR}]`)) {
      return
    }

    const tenantSpace = config.value.config.tenantSpace
    const shopCountryId = config.value.country.shopCountryId
    const scriptUrl = new URL(
      `/frontend/checkout-wc/js?appId=${shopCountryId}`,
      getCheckoutOrigin(tenantSpace),
    ).toString()

    // No `defer`: it only applies to parser-inserted scripts, and a script
    // appended this way is already fetched and executed asynchronously.
    const script = document.createElement('script')
    script.src = scriptUrl
    script.crossOrigin = 'anonymous'
    script.referrerPolicy = 'no-referrer'
    script.setAttribute(SCRIPT_MARKER_ATTR, '')

    document.head.appendChild(script)
  })
}
