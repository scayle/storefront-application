import { beforeAll, describe, expect, vi, it } from 'vitest'
import { router } from '@inertiajs/vue3'
import { HttpNetworkError, HttpResponseError, http } from '@inertiajs/core'
import type { Page } from '@inertiajs/core'
import { partialReload } from './router'

// Runs `partialReload` against the real Inertia router with a fake transport.
// Which callback Inertia calls for a failed request is Inertia's contract, and a
// mocked `router.reload` only repeats what the test assumes about it.

const PAGE_URL = '/basket'

const initialPage: Page = {
  component: 'Basket',
  // Neither the router nor `partialReload` reads the shared props here.
  props: { errors: {} } as Page['props'],
  url: PAGE_URL,
  version: null,
  rescuedProps: [],
  flash: {},
  rememberedState: {},
}

describe('partialReload with the Inertia router', () => {
  beforeAll(() => {
    history.replaceState(null, '', PAGE_URL)
    router.init({
      initialPage,
      resolveComponent: async () => ({}),
      swapComponent: async () => {},
    })
  })

  it.for([
    {
      name: 'answers with a server error',
      event: 'httpException',
      fail: () => {
        throw new HttpResponseError(
          'Internal Server Error',
          {
            status: 500,
            data: JSON.stringify({ ...initialPage, component: 'Error' }),
            headers: { 'x-inertia': 'true' },
          },
          PAGE_URL,
        )
      },
      error: expect.objectContaining({ status: 500 }),
    },
    {
      name: 'fails on the network',
      event: 'networkError',
      fail: () => {
        throw new HttpNetworkError('Network error', PAGE_URL)
      },
      error: expect.any(HttpNetworkError),
    },
  ] as const)(
    'reports the failure and still fires the global $event listener when the reload $name',
    async ({ event, fail, error }) => {
      http.setClient({ request: async () => fail() })
      // Like the listeners in `main.ts`, which keep the page and show the toast.
      const listener = vi.fn((event: Event) => event.preventDefault())
      const stopListening = router.on(event, listener)

      const result = await partialReload(['basket'])
      stopListening()

      expect(result).toEqual({ error, cancelled: false })
      expect(listener).toHaveBeenCalledOnce()
    },
  )
})
