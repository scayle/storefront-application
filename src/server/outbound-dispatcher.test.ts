import { createServer } from 'node:http'
import type { RequestListener, Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { getGlobalDispatcher, setGlobalDispatcher } from 'undici'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOutboundDispatcher } from './outbound-dispatcher'

// Real timers and a real socket: undici's timeout clock is module state that
// fake timers do not drive reliably. The tests pass a short timeout instead of
// the production one. undici checks these timeouts on a clock that ticks about
// every 500 ms, so each test still takes about a second.
const TEST_RESPONSE_TIMEOUT_MS = 100

// Below the production 3 s, so a dispatcher that ignored its timeout argument
// would fail the test instead of passing slowly.
describe('createOutboundDispatcher', { timeout: 2_000 }, () => {
  let server: Server | undefined

  async function listen(handler: RequestListener): Promise<string> {
    const httpServer = createServer(handler)
    await new Promise<void>((resolve) =>
      httpServer.listen(0, '127.0.0.1', resolve),
    )
    server = httpServer
    return `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`
  }

  const defaultDispatcher = getGlobalDispatcher()

  // Registered the way `src/server/index.ts` does it: the global `fetch` comes
  // from the undici bundled with Node, which reads only the legacy-API wrapper
  // `setGlobalDispatcher` installs, and rejects this dispatcher passed directly.
  function fetchThroughDispatcher(url: string): Promise<Response> {
    // A proxy set in the shell would otherwise receive the local call.
    vi.stubEnv('no_proxy', '*')
    setGlobalDispatcher(createOutboundDispatcher(TEST_RESPONSE_TIMEOUT_MS))
    return fetch(url)
  }

  afterEach(() => {
    setGlobalDispatcher(defaultDispatcher)
    server?.closeAllConnections()
    server?.close()
  })

  it('fails a call whose response headers never arrive', async () => {
    const url = await listen(() => {})

    const error = await fetchThroughDispatcher(url).catch(
      (error: unknown) => error,
    )

    expect(error).toMatchObject({
      cause: { code: 'UND_ERR_HEADERS_TIMEOUT' },
    })
  })

  it('fails a call whose response body stalls after the first chunk', async () => {
    const url = await listen((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.write('{')
    })
    const response = await fetchThroughDispatcher(url)

    const error = await response.text().catch((error: unknown) => error)

    expect(error).toMatchObject({ cause: { code: 'UND_ERR_BODY_TIMEOUT' } })
  })
})
