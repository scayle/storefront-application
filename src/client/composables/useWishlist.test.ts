import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'
import { useWishlist } from './useWishlist'

const mocks = vi.hoisted(() => ({
  reactivePage: null as {
    props: { wishlist?: { items: { productId: number }[] } }
  } | null,
  routerReload: vi.fn(),
  reloadImpl: null as
    | ((opts: {
        only: string[]
        onFinish?: () => void
        onHttpException?: (response: unknown) => void
      }) => void)
    | null,
  rpcToggle: vi.fn(),
  toastShow: vi.fn(),
}))

vi.mock('@inertiajs/vue3', () => {
  mocks.reactivePage = reactive({
    props: {},
  })

  return {
    usePage: vi.fn(() => mocks.reactivePage),
    router: {
      reload: (opts: {
        only: string[]
        onFinish?: () => void
        onHttpException?: (response: unknown) => void
      }) => {
        mocks.routerReload(opts)
        if (mocks.reloadImpl) {
          mocks.reloadImpl(opts)
        } else {
          opts.onFinish?.()
        }
      },
    },
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@client/composables/useRpcClient', async () => {
  const { createRpcClientMock } = await import('@test/utils/orpc')
  return createRpcClientMock({
    wishlist: {
      toggle: mocks.rpcToggle,
    },
  })
})

const mockWishlist = { items: [] }

describe('useWishlist', () => {
  beforeEach(() => {
    if (mocks.reactivePage) {
      mocks.reactivePage.props = {}
    }
    mocks.reloadImpl = null
    mocks.rpcToggle.mockResolvedValue(
      createSafeSuccess({
        success: true,
        action: 'added',
        wishlist: mockWishlist,
      }),
    )
  })

  it('returns undefined wishlist and count 0 when wishlist prop is missing', () => {
    const { wishlist, count } = useWishlist()

    expect(wishlist.value).toBeUndefined()
    expect(count.value).toBe(0)
  })

  it('computes count from wishlist items length', () => {
    if (mocks.reactivePage) {
      mocks.reactivePage.props.wishlist = {
        items: [{ productId: 1 }, { productId: 2 }],
      }
    }

    const { wishlist, count } = useWishlist()

    expect(wishlist.value?.items).toHaveLength(2)
    expect(count.value).toBe(2)
  })

  it('hasProductInWishlist returns true when product exists', () => {
    if (mocks.reactivePage) {
      mocks.reactivePage.props.wishlist = {
        items: [{ productId: 42 }, { productId: 7 }],
      }
    }

    const { hasProductInWishlist } = useWishlist()

    expect(hasProductInWishlist(42)).toBe(true)
    expect(hasProductInWishlist(7)).toBe(true)
    expect(hasProductInWishlist(99)).toBe(false)
  })

  describe('toggleItem', () => {
    it('calls rpc toggle and reloads wishlist prop on success', async () => {
      let reloadCalled = false
      mocks.reloadImpl = (opts) => {
        reloadCalled = true
        expect(mocks.rpcToggle).toHaveBeenCalledWith({ productId: 123 })
        opts.onFinish?.()
      }

      const { toggleItem } = useWishlist()

      const result = await toggleItem(123)

      expect(reloadCalled).toBe(true)
      expect(mocks.routerReload).toHaveBeenCalledWith(
        expect.objectContaining({ only: ['wishlist'] }),
      )
      expect(mocks.toastShow).not.toHaveBeenCalled()
      expect(result).toEqual({ added: true })
    })

    it('returns added=false when the rpc reports removal', async () => {
      mocks.rpcToggle.mockResolvedValue(
        createSafeSuccess({
          success: true,
          action: 'removed',
          wishlist: mockWishlist,
        }),
      )

      const { toggleItem } = useWishlist()

      const result = await toggleItem(321)

      expect(result).toEqual({ added: false })
    })

    it('shows error toast and returns error when rpc call fails', async () => {
      const rpcError = new Error('Network error')
      mocks.rpcToggle.mockResolvedValue(createSafeFailure(rpcError))
      mocks.reloadImpl = (opts) => opts.onFinish?.()

      const { toggleItem } = useWishlist()

      const result = await toggleItem(456)

      expect(mocks.toastShow).toHaveBeenCalledWith(
        'wishlist_page.notification.toggle_error',
        { type: 'ERROR' },
      )
      expect(result.added).toBe(false)
      expect(result.error).toBe(rpcError)
    })

    it('shows error toast and returns error on soft rpc failure', async () => {
      mocks.rpcToggle.mockResolvedValue(
        createSafeSuccess({
          success: false,
          error: 'Failed to add item: SAPI_DOWN',
        }),
      )
      mocks.reloadImpl = (opts) => opts.onFinish?.()

      const { toggleItem } = useWishlist()

      const result = await toggleItem(654)

      expect(mocks.toastShow).toHaveBeenCalledWith(
        'wishlist_page.notification.toggle_error',
        { type: 'ERROR' },
      )
      expect(result.added).toBe(false)
      expect(result.error).toEqual(new Error('Failed to add item: SAPI_DOWN'))
    })

    // A failed reload already showed the global error toast from `main.ts`, so
    // the toggle adds none of its own, whether its own request landed or not.
    it.for([
      { name: 'the toggle landed', toggle: () => {}, added: true },
      {
        name: 'the toggle failed too',
        toggle: () =>
          mocks.rpcToggle.mockResolvedValue(
            createSafeFailure(new Error('Network error')),
          ),
        added: false,
      },
    ])(
      'shows no toast when the reload fails and $name',
      async ({ toggle, added }) => {
        toggle()
        mocks.reloadImpl = (opts) => {
          opts.onHttpException?.({ status: 500 })
          opts.onFinish?.()
        }

        const { toggleItem } = useWishlist()

        const result = await toggleItem(789)

        expect(mocks.toastShow).not.toHaveBeenCalled()
        expect(result.added).toBe(added)
      },
    )

    it('coalesces concurrent calls for the same productId', async () => {
      const deferredRpc =
        Promise.withResolvers<ReturnType<typeof createSafeSuccess>>()
      mocks.rpcToggle.mockImplementation(() => deferredRpc.promise)

      const { toggleItem, isProductToggling } = useWishlist()

      const first = toggleItem(555)
      const second = toggleItem(555)

      expect(first).toBe(second)
      expect(mocks.rpcToggle).toHaveBeenCalledTimes(1)
      expect(isProductToggling(555)).toBe(true)
      expect(isProductToggling(999)).toBe(false)

      deferredRpc.resolve(
        createSafeSuccess({
          success: true,
          action: 'added',
          wishlist: mockWishlist,
        }),
      )
      await first

      expect(isProductToggling(555)).toBe(false)
    })

    it('does not share an in-flight toggle between callers during a server render', async () => {
      // This project runs in Node, where `createSharedComposable` hands out
      // one instance per call, as it does on the server.
      const first = useWishlist()
      const second = useWishlist()

      const pending = first.toggleItem(555)

      expect(first.isProductToggling(555)).toBe(true)
      expect(second.isProductToggling(555)).toBe(false)
      // Lets the toggle settle before the next test.
      await pending
    })
  })

  describe('logout reset behavior', () => {
    it('resets hasProductInWishlist and count when the wishlist prop is cleared after logout', () => {
      if (mocks.reactivePage) {
        mocks.reactivePage.props.wishlist = {
          items: [{ productId: 10 }, { productId: 20 }],
        }
      }

      const { count, hasProductInWishlist } = useWishlist()
      expect(count.value).toBe(2)
      expect(hasProductInWishlist(10)).toBe(true)
      expect(hasProductInWishlist(20)).toBe(true)

      // Simulate logout: server returns an empty guest wishlist
      if (mocks.reactivePage) {
        mocks.reactivePage.props.wishlist = { items: [] }
      }

      expect(count.value).toBe(0)
      expect(hasProductInWishlist(10)).toBe(false)
      expect(hasProductInWishlist(20)).toBe(false)
    })
  })
})
