import { onMounted } from 'vue'
import { getSubscriptionOrigin } from '@scayle/storefront/shared'
import { useStorefrontConfig } from './useStorefrontConfig'

/**
 * Mounts the SCAYLE Subscription web component script once into `document.head`.
 *
 * The script is appended directly rather than through Inertia's `<Head>` so it
 * survives every navigation. A per-page `<Head>` declaration breaks here:
 * Inertia adds and removes the `<script>` on navigations that change the head,
 * and the web component's initializer reads
 * `document.currentScript.parentNode.insertBefore(...)`. When Inertia detaches
 * the element mid-run (for example during a chained auth redirect), that parent
 * is `null` and the script throws, taking the Inertia page update down with it.
 *
 * Calling this more than once is safe. It checks the marker attribute and bails
 * if the script is already present. Call it from the pages that render a
 * subscription web component (`AccountSubscriptions.vue`,
 * `SubscriptionCancellation.vue`). The tag then stays in `document.head` for the
 * rest of the session.
 *
 * Both pages return a 404 from their controller when the active country does
 * not set `subscriptionEnabled`, so this does not check the flag again. The
 * host is derived from the tenant space (`getSubscriptionOrigin` from
 * `@scayle/storefront/shared`). It points at SCAYLE-operated infrastructure, so
 * the script runs in the customer session without an integrity hash (the
 * component is not version-pinned in the URL).
 *
 * The tag deliberately carries no `fetchpriority="high"`, for the reason spelled
 * out on `useCheckoutWebComponentScript`: the tag is appended from `onMounted`,
 * after the early load window a priority hint applies to, so the hint bought
 * nothing and only made the script bid against the page's own resources.
 *
 * @param variant The web component to load: 'overview' or 'cancellation'.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/subscriptions
 */
export function useSubscriptionWebComponentScript(
  variant: 'overview' | 'cancellation',
): void {
  const { config } = useStorefrontConfig()
  const markerAttr = `data-subscription-web-component-script-${variant}`

  onMounted(() => {
    if (document.querySelector(`script[${markerAttr}]`)) {
      return
    }

    const origin = getSubscriptionOrigin(config.value.config.tenantSpace)
    const scriptUrl = `${origin}/libs/subscription-${variant}/latest/subscription-${variant}.umd.js`

    // No `defer`: it only applies to parser-inserted scripts, and a script
    // appended this way is already fetched and executed asynchronously.
    const script = document.createElement('script')
    script.src = scriptUrl
    script.crossOrigin = 'anonymous'
    script.referrerPolicy = 'no-referrer'
    script.setAttribute(markerAttr, '')

    document.head.appendChild(script)
  })
}
