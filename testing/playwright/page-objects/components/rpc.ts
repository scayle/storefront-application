import type { APIRequestContext, Page } from '@playwright/test'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { SimpleCsrfProtectionLinkPlugin } from '@orpc/client/plugins'
import { readInertiaPageData } from '../../support/inertia'

/** Subset of the storefront oRPC router used by E2E RPC helpers (avoids typechecking the full app graph in this tsconfig). */
interface E2EApiRouter {
  basket: {
    add: (input: { variantId: number; quantity?: number }) => Promise<unknown>
    remove: (input: { itemKey: string }) => Promise<unknown>
  }
  wishlist: {
    add: (input: { productId: number }) => Promise<unknown>
  }
}

/**
 * E2E-facing RPC method names mapped to V3 oRPC procedures.
 */
type E2ERpcMethod =
  'addItemToBasket' | 'removeItemFromBasket' | 'addItemToWishlist'

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }
  if (input instanceof URL) {
    return input.href
  }
  return input.url
}

/**
 * oRPC expects a Fetch `Response` (`headers.get`, etc.). Playwright `APIRequestContext#fetch` returns `APIResponse`
 * (`headers()` method, plain header map), so we normalize here.
 */
async function apiResponseToFetchResponse(
  api: Awaited<ReturnType<APIRequestContext['fetch']>>,
): Promise<Response> {
  const headers = new Headers()
  for (const { name, value } of api.headersArray()) {
    headers.append(name, value)
  }
  const raw = await api.body()
  const body: BodyInit | null =
    raw.byteLength === 0 ? null : new Uint8Array(raw)
  return new Response(body, {
    status: api.status(),
    headers,
  })
}

type PlaywrightFetchOptions = NonNullable<
  Parameters<APIRequestContext['fetch']>[1]
>

/**
 * Timeout in milliseconds for one RPC request. A shop with a slower API can raise it with
 * `E2E_RPC_TIMEOUT_MS`.
 */
const RPC_TIMEOUT_MS = ((): number => {
  const raw = process.env.E2E_RPC_TIMEOUT_MS
  const parsed = Number(raw)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }
  if (raw !== undefined && raw.trim() !== '') {
    console.warn(
      `E2E_RPC_TIMEOUT_MS must be a number above 0, got "${raw}". Using 5000.`,
    )
  }
  return 5000
})()

/**
 * Bridges oRPC's `fetch(Request, init)` to Playwright `APIRequestContext#fetch`.
 * Playwright expects a URL string plus its own options shape (not a Web `Request`); passing a DOM `Request`
 * breaks internally (`options.request.url is not a function`). We also avoid URL-only calls so POST bodies are kept.
 */
async function fetchViaPlaywright(
  http: APIRequestContext,
  requestInput: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!(requestInput instanceof Request)) {
    const apiResponse = await http.fetch(
      requestUrl(requestInput as RequestInfo | URL),
      {
        ...(init &&
        typeof init === 'object' &&
        init !== null &&
        !Array.isArray(init)
          ? init
          : {}),
        timeout: RPC_TIMEOUT_MS,
      } as PlaywrightFetchOptions,
    )
    return apiResponseToFetchResponse(apiResponse)
  }

  const request = requestInput
  const headers: { [key: string]: string } = {}
  request.headers.forEach((value, name) => {
    const current = headers[name]
    headers[name] = current !== undefined ? `${current}, ${value}` : value
  })

  const options: PlaywrightFetchOptions = {
    method: request.method,
    headers,
    timeout: RPC_TIMEOUT_MS,
  }

  if (init?.redirect === 'manual') {
    options.maxRedirects = 0
  }

  const method = request.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') {
    const bodyText = await request.text()
    if (bodyText.length > 0) {
      const contentType = request.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        options.data = JSON.parse(bodyText) as Record<string, unknown>
      } else {
        options.data = bodyText
      }
    }
  }

  const apiResponse = await http.fetch(request.url, options)
  return apiResponseToFetchResponse(apiResponse)
}

/**
 * Playwright helper to call storefront oRPC procedures with the same cookies as the open page.
 *
 * Resolves Inertia `shopCountryId` from the page's Inertia payload (same props as `usePage()` on the client).
 * Optional override is useful when `E2E_SHOP_ID` should force a specific country context.
 */
export class RPC {
  private readonly page: Page
  private readonly shopCountryIdOverride: number | undefined

  constructor(page: Page, shopCountryIdOverride?: number) {
    this.page = page
    this.shopCountryIdOverride = shopCountryIdOverride
  }

  private async resolveShopCountryId(): Promise<number> {
    if (this.shopCountryIdOverride !== undefined) {
      return this.shopCountryIdOverride
    }
    const pageData = await readInertiaPageData<{
      props?: { storefront?: { country?: { shopCountryId?: number } } }
    }>(this.page)
    if (!pageData) {
      throw new Error(
        'Inertia page data not found or not valid JSON. Expected #app[data-page] JSON or script[type="application/json"][data-page].',
      )
    }

    const id = pageData.props?.storefront?.country?.shopCountryId
    if (typeof id !== 'number') {
      throw new Error(
        'Could not read shopCountryId from Inertia props (storefront.country.shopCountryId).',
      )
    }
    return id
  }

  private async createClient(): Promise<E2EApiRouter> {
    const origin = new URL(this.page.url()).origin
    const shopCountryId = await this.resolveShopCountryId()
    const http = this.page.request

    return createORPCClient(
      new RPCLink({
        url: `${origin}/api`,
        headers: () => ({
          'Content-Type': 'application/json',
          'X-Shop-Country-Id': shopCountryId.toString(),
        }),
        fetch: (requestInput, init) =>
          fetchViaPlaywright(http, requestInput as RequestInfo | URL, init),
        // Match `createBrowserOrpcClient`: the RPC handler rejects mutations without this marker.
        plugins: [new SimpleCsrfProtectionLinkPlugin()],
      }),
    ) as unknown as E2EApiRouter
  }

  /**
   * Calls a storefront oRPC procedure via a short E2E method name.
   *
   * @param method E2E procedure name (mapped to `basket.*` / `wishlist.*`).
   * @param params Procedure input; must match the mapped oRPC contract.
   */
  async call(
    method: 'addItemToBasket',
    params: { variantId: number; quantity?: number },
  ): Promise<unknown>
  async call(
    method: 'removeItemFromBasket',
    params: { itemKey: string },
  ): Promise<unknown>
  async call(
    method: 'addItemToWishlist',
    params: { productId: number },
  ): Promise<unknown>
  async call(method: E2ERpcMethod, params: unknown): Promise<unknown> {
    const client = await this.createClient()

    switch (method) {
      case 'addItemToBasket':
        return client.basket.add(
          params as { variantId: number; quantity?: number },
        )
      case 'removeItemFromBasket':
        return client.basket.remove(params as { itemKey: string })
      case 'addItemToWishlist':
        return client.wishlist.add(params as { productId: number })
      default: {
        const _exhaustive: never = method
        return _exhaustive
      }
    }
  }
}
