import { EnvHttpProxyAgent } from 'undici'

/**
 * Caps concurrent outbound connections per origin. Too few queue page
 * requests under load; too many waste sockets on every origin.
 */
export const CONNECTIONS_PER_ORIGIN = 32

// Applied to both the wait for response headers and the silence between two
// body chunks, so a stall before or during the body fails the call after this
// long. Sits above the 7-day p99 of every origin that uses the global `fetch`
// (Datadog APM outbound spans), so a healthy but slow response still arrives.
const RESPONSE_TIMEOUT_MS = 3_000

/**
 * Creates the process-wide dispatcher behind every call to the global
 * `fetch`: Storefront API, Checkout API, Storyblok, and the S3 sitemap
 * source. Contentful, Contentstack, Amplience, and Constructor bring
 * their own HTTP clients and are not affected. Registered once with
 * `setGlobalDispatcher` in `src/server/index.ts`.
 *
 * undici's defaults drop idle sockets after 4 s and cap nothing, so each Node
 * process would often pay a fresh TCP/TLS handshake instead of reusing a warm
 * connection, and a stalled upstream would hold a page for up to 300 s.
 * `EnvHttpProxyAgent` also honors `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`
 * from the process environment.
 *
 * None of the timers runs while a call waits for a free socket, so when an
 * upstream stalls every socket to its origin, the nth concurrent call to it
 * fails after about `ceil(n / CONNECTIONS_PER_ORIGIN) × RESPONSE_TIMEOUT_MS`.
 * Raising the connection cap shortens that queue during an outage, at the
 * cost of more sockets per origin. Limits for a single origin belong in the
 * Agent `factory` option: https://undici.nodejs.org/api/Agent
 *
 * @param responseTimeoutMs How long a call waits for its response headers,
 * and for the next body chunk, before it fails. Tests pass a short value so
 * they don't wait out the production timeout.
 * @returns Dispatcher to pass to `setGlobalDispatcher`
 */
export function createOutboundDispatcher(
  responseTimeoutMs = RESPONSE_TIMEOUT_MS,
): EnvHttpProxyAgent {
  return new EnvHttpProxyAgent({
    connections: CONNECTIONS_PER_ORIGIN, // default: unlimited
    keepAliveTimeout: 30_000, // default: 4_000
    connect: { timeout: 5_000 }, // default: 10_000
    headersTimeout: responseTimeoutMs, // default: 300_000
    bodyTimeout: responseTimeoutMs, // default: 300_000
  })
}
