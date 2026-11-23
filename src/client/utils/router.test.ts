import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { GlobalEvent, PendingVisit, VisitOptions } from '@inertiajs/core'
import { computed } from 'vue'
import type { StorefrontNotification } from '@client/types'
import {
  handleHttpException,
  isPartialReload,
  preserveUrlOnDeferredReload,
} from './router'

interface ReloadOpts {
  only: string[]
  onFinish?: () => void
  onHttpException?: (e: unknown) => void
  onCancel?: () => void
  onCancelToken?: (token: { cancel: () => void }) => void
}

const mocks = vi.hoisted(() => ({
  routerReload: vi.fn(),
  reloadImpl: null as ((opts: ReloadOpts) => void) | null,
}))

vi.mock('@inertiajs/vue3', () => ({
  router: {
    reload: (opts: ReloadOpts) => {
      mocks.routerReload(opts)
      if (mocks.reloadImpl) {
        mocks.reloadImpl(opts)
      } else {
        opts.onFinish?.()
      }
    },
  },
}))

let partialReload: typeof import('./router').partialReload

const visit = (
  overrides: Partial<
    Pick<PendingVisit, 'only' | 'except' | 'prefetch' | 'reset'>
  > = {},
): PendingVisit =>
  ({
    only: [],
    except: [],
    reset: [],
    prefetch: false,
    ...overrides,
  }) as PendingVisit

/**
 * Records which of the promises have settled. Read it after
 * {@link flushMicrotasks}, since `then` callbacks run on the microtask queue.
 */
const trackSettled = (...promises: Promise<unknown>[]) => {
  const settled = promises.map(() => false)
  promises.forEach((promise, index) => {
    void promise.then(() => {
      settled[index] = true
    })
  })
  return settled
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('isPartialReload', () => {
  it.for<{ name: string; pendingVisit: PendingVisit; expected: boolean }>([
    { name: 'a full navigation', pendingVisit: visit(), expected: false },
    {
      name: 'a set only list',
      pendingVisit: visit({ only: ['wishlist'] }),
      expected: true,
    },
    {
      name: 'a set except list',
      pendingVisit: visit({ except: ['basket'] }),
      expected: true,
    },
    {
      name: 'a set reset list',
      pendingVisit: visit({ reset: ['products'] }),
      expected: true,
    },
    {
      name: 'a prefetch with no partial prop lists',
      pendingVisit: visit({ prefetch: true }),
      expected: true,
    },
  ])('is $expected for $name', ({ pendingVisit, expected }) => {
    expect(isPartialReload(pendingVisit)).toBe(expected)
  })
})

describe('preserveUrlOnDeferredReload', () => {
  // Inertia passes `deferredProps: true` on the visits `loadDeferredProps`
  // starts, a flag its public `VisitOptions` type does not declare.
  it.for<{ name: string; options: VisitOptions; expected: VisitOptions }>([
    {
      name: 'keeps the current URL for a deferred props request',
      options: {
        only: ['similarProducts'],
        deferredProps: true,
      } as VisitOptions,
      expected: { preserveUrl: true },
    },
    {
      name: 'leaves an ordinary partial reload unchanged',
      options: { only: ['basket'] },
      expected: {},
    },
    {
      name: 'leaves a navigation unchanged',
      options: {},
      expected: {},
    },
  ])('$name', ({ options, expected }) => {
    expect(preserveUrlOnDeferredReload('/p/p-1', options)).toEqual(expected)
  })
})

describe('handleHttpException', () => {
  const PAGE_URL = '/c/women?sort=new'
  const page = { url: PAGE_URL, component: 'ProductListing' }
  const text = { message: 'Something went wrong', reload: 'Reload' }

  const httpException = (
    status: number,
    url: string,
  ): GlobalEvent<'httpException'> =>
    new CustomEvent('inertia:httpException', {
      cancelable: true,
      detail: { response: { status, headers: {}, data: { url } } },
    })

  const toastWith = (notifications: StorefrontNotification[] = []) => ({
    show: vi.fn(),
    notifications: computed(() => notifications),
  })

  const errorToastLinkingTo = (href: string): StorefrontNotification => ({
    id: 'toast-1',
    message: text.message,
    type: 'ERROR',
    action: { text: text.reload, href },
  })

  beforeEach(() => {
    vi.stubGlobal('location', new URL(`https://shop.test${PAGE_URL}`))
  })

  it.for<{ name: string; status: number; url: string; kept: boolean }>([
    {
      name: 'keeps the page for a 4xx on its own URL',
      status: 404,
      url: PAGE_URL,
      kept: true,
    },
    {
      name: 'keeps the page for a 5xx on its own path with a new query',
      status: 500,
      url: '/c/women?sort=price',
      kept: true,
    },
    {
      name: 'shows the response for a 4xx on its own path with a new query',
      status: 404,
      url: '/c/women?sort=price',
      kept: false,
    },
    {
      name: 'shows the response for a 5xx on another path',
      status: 500,
      url: '/c/men',
      kept: false,
    },
  ])('$name', ({ status, url, kept }) => {
    const event = httpException(status, url)

    handleHttpException(event, page, toastWith(), text)

    expect(event.defaultPrevented).toBe(kept)
  })

  it('shows the error toast with a Reload link to the page URL', () => {
    const toast = toastWith()

    handleHttpException(httpException(500, PAGE_URL), page, toast, text)

    expect(toast.show).toHaveBeenCalledExactlyOnceWith(text.message, {
      type: 'ERROR',
      action: 'ROUTE',
      to: PAGE_URL,
      text: text.reload,
    })
  })

  it('shows no second toast while one linking to the page URL is visible', () => {
    const toast = toastWith([errorToastLinkingTo(PAGE_URL)])

    handleHttpException(httpException(500, PAGE_URL), page, toast, text)

    expect(toast.show).not.toHaveBeenCalled()
  })

  it('shows a new toast when the visible one links to an earlier URL', () => {
    const toast = toastWith([errorToastLinkingTo('/c/women?sort=old')])

    handleHttpException(httpException(500, PAGE_URL), page, toast, text)

    expect(toast.show).toHaveBeenCalledOnce()
  })

  it.for(['Error', 'NotFound'])(
    'shows no toast on the %s page',
    (component) => {
      const toast = toastWith()

      handleHttpException(
        httpException(500, PAGE_URL),
        { url: PAGE_URL, component },
        toast,
        text,
      )

      expect(toast.show).not.toHaveBeenCalled()
    },
  )
})

describe('partialReload', () => {
  beforeEach(async () => {
    mocks.reloadImpl = null
    vi.resetModules()
    const mod = await import('./router')
    partialReload = mod.partialReload
  })

  it('passes the only list to router.reload and resolves without error or cancellation', async () => {
    const result = await partialReload(['basket'])

    expect(mocks.routerReload).toHaveBeenCalledWith(
      expect.objectContaining({ only: ['basket'] }),
    )
    expect(result).toEqual({ error: undefined, cancelled: false })
  })

  // Failure detection is covered in `router.inertia.vue.test.ts`.

  // Inertia cancels in-flight async requests on navigation and fires
  // `onFinish` without an error callback, so callers that read the reloaded
  // props as the result of their own mutation need the flag to tell the two
  // apart.
  it('reports a cancellation that reached onFinish without an error', async () => {
    mocks.reloadImpl = (opts) => {
      opts.onCancel?.()
      opts.onFinish?.()
    }

    const result = await partialReload(['basket'])

    expect(result.cancelled).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('cancels the earlier requests when called again with the same only list', () => {
    const cancels: Array<Mock<() => void>> = []

    mocks.reloadImpl = (opts) => {
      const cancel = vi.fn<() => void>()
      cancels.push(cancel)
      opts.onCancelToken?.({ cancel })
    }

    void partialReload(['basket'])
    void partialReload(['basket'])
    void partialReload(['basket'])

    expect(cancels.map((cancel) => cancel.mock.calls.length)).toEqual([1, 1, 0])
  })

  it('resolves every call with the same only list once the last one finishes', async () => {
    const finishCallbacks: Array<() => void> = []

    mocks.reloadImpl = (opts) => {
      opts.onCancelToken?.({
        cancel: () => opts.onFinish?.(),
      })
      finishCallbacks.push(() => opts.onFinish?.())
    }

    const settled = trackSettled(
      partialReload(['basket']),
      partialReload(['basket']),
      partialReload(['basket']),
    )

    await flushMicrotasks()
    expect(settled).toEqual([false, false, false])

    finishCallbacks.at(-1)!()

    await flushMicrotasks()
    expect(settled).toEqual([true, true, true])
  })

  it('all coalesced callers receive the same error', async () => {
    interface Request {
      finish: () => void
      error: (e: unknown) => void
    }
    const requests: Request[] = []

    mocks.reloadImpl = (opts) => {
      opts.onCancelToken?.({
        cancel: () => opts.onFinish?.(),
      })
      requests.push({
        finish: () => opts.onFinish?.(),
        error: (e: unknown) => {
          opts.onHttpException?.(e)
          opts.onFinish?.()
        },
      })
    }

    const promise1 = partialReload(['basket'])
    const promise2 = partialReload(['basket'])

    requests.at(-1)!.error('server-error')

    const [result1, result2] = await Promise.all([promise1, promise2])

    expect(result1.error).toBe('server-error')
    expect(result2.error).toBe('server-error')
  })

  it('a fresh reload after a completed one creates a new independent promise', async () => {
    interface FinishFn {
      finish: () => void
    }
    const requests: FinishFn[] = []

    mocks.reloadImpl = (opts) => {
      opts.onCancelToken?.({
        cancel: () => opts.onFinish?.(),
      })
      requests.push({ finish: () => opts.onFinish?.() })
    }

    const promise1 = partialReload(['basket'])
    requests[0]!.finish()
    const result1 = await promise1
    expect(result1.error).toBeUndefined()

    const promise2 = partialReload(['basket'])
    requests[1]!.finish()
    const result2 = await promise2
    expect(result2.error).toBeUndefined()
  })

  it('different only lists maintain independent state', async () => {
    interface FinishFn {
      finish: () => void
      error: (e: unknown) => void
    }
    const requests: FinishFn[] = []

    mocks.reloadImpl = (opts) => {
      opts.onCancelToken?.({
        cancel: () => opts.onFinish?.(),
      })
      requests.push({
        finish: () => opts.onFinish?.(),
        error: (e: unknown) => {
          opts.onHttpException?.(e)
          opts.onFinish?.()
        },
      })
    }

    const basketPromise = partialReload(['basket'])
    const wishlistPromise = partialReload(['wishlist'])

    requests[0]!.finish()
    requests[1]!.error('wishlist-error')

    const basketResult = await basketPromise
    const wishlistResult = await wishlistPromise

    expect(basketResult.error).toBeUndefined()
    expect(wishlistResult.error).toBe('wishlist-error')
  })

  it('concurrent call on one key does not cancel a call on a different key', async () => {
    interface FinishFn {
      finish: () => void
    }
    const requests: Array<FinishFn & { only: string[] }> = []

    mocks.reloadImpl = (opts) => {
      opts.onCancelToken?.({
        cancel: () => opts.onFinish?.(),
      })
      requests.push({
        only: opts.only,
        finish: () => opts.onFinish?.(),
      })
    }

    const settled = trackSettled(
      partialReload(['basket']),
      partialReload(['wishlist']),
      partialReload(['basket']),
    )

    await flushMicrotasks()
    expect(settled).toEqual([false, false, false])

    // Finish only the latest basket request. Both basket promises should resolve,
    // but the wishlist promise should remain pending.
    const lastBasketRequest = requests
      .toReversed()
      .find((r) => r.only.includes('basket'))!
    lastBasketRequest.finish()

    await flushMicrotasks()
    expect(settled).toEqual([true, false, true])

    // Now finish the wishlist request independently.
    const wishlistRequest = requests.find((r) => r.only.includes('wishlist'))!
    wishlistRequest.finish()

    await flushMicrotasks()
    expect(settled).toEqual([true, true, true])
  })
})
