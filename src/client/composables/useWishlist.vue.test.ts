import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createSafeSuccess } from '@test/utils/orpc'
import { useWishlist } from './useWishlist'

const mocks = vi.hoisted(() => ({
  rpcToggle: vi.fn(),
}))

vi.mock('@client/composables/usePage', () => ({
  usePage: () => ({ props: {} }),
}))

vi.mock('@client/utils/router', () => ({
  partialReload: () => Promise.resolve({}),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: vi.fn() }),
}))

vi.mock('@client/composables/useRpcClient', async () => {
  const { createRpcClientMock } = await import('@test/utils/orpc')
  return createRpcClientMock({
    wishlist: {
      toggle: mocks.rpcToggle,
    },
  })
})

function mountCaller() {
  const wrapper = mount(
    defineComponent({
      setup: () => ({ wishlist: useWishlist() }),
      render: () => null,
    }),
  )
  return wrapper.vm.wishlist
}

describe('useWishlist in the browser', () => {
  it('shares an in-flight toggle between mounted callers', async () => {
    mocks.rpcToggle.mockResolvedValue(
      createSafeSuccess({
        success: true,
        action: 'added',
        wishlist: { items: [] },
      }),
    )
    const first = mountCaller()
    const second = mountCaller()

    const pending = first.toggleItem(555)

    expect(second.isProductToggling(555)).toBe(true)
    expect(second.toggleItem(555)).toBe(pending)
    await pending
  })
})
