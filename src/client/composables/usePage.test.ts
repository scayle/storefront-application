import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactivePageMock } from '@test/utils/inertia'
import { usePage } from './usePage'

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
  useInertiaPage: vi.fn(),
}))

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage } = await import('@test/utils/inertia')
  mocks.reactivePage = createReactivePage({}, { component: 'Search' })
  mocks.useInertiaPage = vi.fn(() => mocks.reactivePage)
  return { usePage: mocks.useInertiaPage }
})

/** The mock page, non-null so tests read it without a guard per access. */
const page = () => mocks.reactivePage as ReactivePageMock

describe('usePage', () => {
  beforeEach(() => {
    page().url = '/'
    page().component = 'Search'
    page().props = {}
  })

  it('returns the page object Inertia owns, not a copy', () => {
    const result = usePage()

    expect(mocks.useInertiaPage).toHaveBeenCalledOnce()
    expect(result).toBe(page())
    expect(result.props).toBe(page().props)
  })
})
