import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactivePageMock } from '@test/utils/inertia'
import { useIsPage } from './usePageComponent'

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
}))

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage } = await import('@test/utils/inertia')
  mocks.reactivePage = createReactivePage({}, { component: 'Basket' })
  return {
    usePage: vi.fn(() => mocks.reactivePage),
  }
})

describe('useIsPage', () => {
  beforeEach(() => {
    mocks.reactivePage!.component = 'Basket'
  })

  it('is active when the current page component matches the given name', () => {
    const { isActive } = useIsPage('Basket')

    expect(isActive.value).toBe(true)
  })

  it('is inactive when the current page component does not match', () => {
    const { isActive } = useIsPage('Checkout')

    expect(isActive.value).toBe(false)
  })

  it('reacts to page component changes', () => {
    const { isActive } = useIsPage('Checkout')

    expect(isActive.value).toBe(false)

    mocks.reactivePage!.component = 'Checkout'
    expect(isActive.value).toBe(true)
  })
})
