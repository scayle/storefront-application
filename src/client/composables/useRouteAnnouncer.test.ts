import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { usePageMeta } from './usePageMeta'
import { useRouteAnnouncer } from './useRouteAnnouncer'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown> | number) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}))

// Mutable mock page so tests can drive `page.component` / `page.props`.
const mockPage = {
  component: 'Home',
  props: {} as Record<string, unknown>,
}
vi.mock('@inertiajs/vue3', () => ({
  usePage: () => mockPage,
}))

// Route announcements now flow through the shared announcer.
const { announce } = vi.hoisted(() => ({ announce: vi.fn() }))
vi.mock('./useAnnouncer', () => ({
  useAnnouncer: () => ({ announce }),
}))

describe('useRouteAnnouncer', () => {
  // `currentTitle` is a module singleton; without a component scope the watch
  // would leak across tests. Run each in its own effect scope and dispose it.
  let scope: ReturnType<typeof effectScope> | undefined
  const { setCurrentTitle } = usePageMeta()

  const run = () => {
    scope = effectScope()
    scope.run(() => useRouteAnnouncer())
  }

  beforeEach(() => {
    vi.stubEnv('SSR', false)
    setCurrentTitle('')
    mockPage.component = 'Home'
    mockPage.props = {}
  })

  afterEach(() => {
    scope?.stop()
    scope = undefined
  })

  it('skips the first title write (initial render)', async () => {
    run()

    setCurrentTitle('Home')
    await nextTick()

    expect(announce).not.toHaveBeenCalled()
  })

  it('announces every title change after the initial one (assertive)', async () => {
    run()

    setCurrentTitle('Home')
    await nextTick()
    expect(announce).not.toHaveBeenCalled()

    setCurrentTitle('PLP')
    await nextTick()
    expect(announce).toHaveBeenLastCalledWith(
      'a11y.navigated_to:{"title":"PLP"}',
      { politeness: 'assertive' },
    )

    setCurrentTitle('Basket')
    await nextTick()
    expect(announce).toHaveBeenLastCalledWith(
      'a11y.navigated_to:{"title":"Basket"}',
      { politeness: 'assertive' },
    )
  })

  it('does not announce when the title is set to the same value', async () => {
    run()

    setCurrentTitle('Home')
    await nextTick()
    setCurrentTitle('PLP')
    await nextTick()
    expect(announce).toHaveBeenCalledTimes(1)

    setCurrentTitle('PLP')
    await nextTick()
    expect(announce).toHaveBeenCalledTimes(1)
  })

  it('does not announce when a page without PageMetaHead clears the title', async () => {
    run()

    setCurrentTitle('Home')
    await nextTick()
    setCurrentTitle('PLP')
    await nextTick()
    expect(announce).toHaveBeenCalledTimes(1)

    setCurrentTitle('')
    await nextTick()
    expect(announce).toHaveBeenCalledTimes(1)
  })

  it('appends the result count when navigating to a search page', async () => {
    mockPage.component = 'Search'
    mockPage.props = { pagination: { totalItems: 69 } }

    run()

    setCurrentTitle('Search sneakers')
    await nextTick()
    setCurrentTitle('Search boots')
    await nextTick()

    expect(announce).toHaveBeenLastCalledWith(
      'a11y.navigated_to:{"title":"Search boots"}. search_page.a11y.result_count:69',
      { politeness: 'assertive' },
    )
  })

  it('announces only the title on search for a term the Storefront API rejects', async () => {
    mockPage.component = 'Search'
    mockPage.props = { pagination: { totalItems: 0 }, termRejected: true }

    run()

    setCurrentTitle('Search sneakers')
    await nextTick()
    setCurrentTitle('Search boots')
    await nextTick()

    expect(announce).toHaveBeenLastCalledWith(
      'a11y.navigated_to:{"title":"Search boots"}',
      { politeness: 'assertive' },
    )
  })

  it('announces only the title on search when the count is unavailable', async () => {
    mockPage.component = 'Search'
    mockPage.props = { pagination: null }

    run()

    setCurrentTitle('Search sneakers')
    await nextTick()
    setCurrentTitle('Search boots')
    await nextTick()

    expect(announce).toHaveBeenLastCalledWith(
      'a11y.navigated_to:{"title":"Search boots"}',
      { politeness: 'assertive' },
    )
  })
})
