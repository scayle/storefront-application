import { defineComponent, h, reactive } from 'vue'
import type { Component } from 'vue'

/**
 * Shape of the reactive object returned by {@link createReactivePage}. Mirrors
 * the subset of Inertia's `Page` that boilerplate composables and pages read:
 * the current `url`, the active page `component`, and the shared `props` bag.
 *
 * `props` is intentionally an open record so each test can seed only the shared
 * data its subject touches (`basket`, `wishlist`, `storefront`, `promotions`, …).
 */
export interface ReactivePageMock {
  url: string
  component: string
  props: Record<string, unknown>
}

/**
 * Builds the reactive `usePage()` stand-in shared by client tests.
 *
 * Every composable and page test that reads Inertia shared data used to rebuild
 * its own `reactive({ url, props })` wrapper inside a `vi.mock('@inertiajs/vue3')`
 * factory. This centralizes that shape so a change to what pages read only needs
 * one edit.
 *
 * Call it inside the mock factory and keep the returned object on a `vi.hoisted`
 * handle so individual tests can mutate `url`/`props` and trigger a re-render:
 *
 * @example
 * ```ts
 * const mocks = vi.hoisted(() => ({ reactivePage: null as ReactivePageMock | null }))
 *
 * vi.mock('@inertiajs/vue3', async () => {
 *   const { createReactivePage } = await import('@test/utils/inertia')
 *   mocks.reactivePage = createReactivePage({ basket: undefined })
 *   return { usePage: vi.fn(() => mocks.reactivePage) }
 * })
 * ```
 *
 * @param props - Initial shared-data props seeded on the page
 * @param options - Optional overrides
 * @param options.url - Current page URL (defaults to `'/'`)
 * @param options.component - Active page component name (defaults to `''`)
 * @returns A `reactive()` page object safe to mutate across a test's lifetime
 */
export function createReactivePage(
  props: Record<string, unknown> = {},
  options: { url?: string; component?: string } = {},
): ReactivePageMock {
  return reactive({
    url: options.url ?? '/',
    component: options.component ?? '',
    props,
  })
}

/**
 * Controls which slot {@link createDeferredStub} renders. Kept as a mutable
 * object so a test can flip `useFallback` between mounts without re-registering
 * the mock.
 */
export interface DeferredStubState {
  useFallback: boolean
}

/**
 * Builds a stub for Inertia's `<Deferred>` wrapper.
 *
 * The real component renders its `fallback` slot until the deferred prop
 * resolves, then swaps in the default slot. Tests that never exercise the
 * loading branch can ignore `state` (default slot always renders); tests that
 * assert the skeleton pass a shared `state` object and toggle `useFallback`.
 *
 * @param state - Mutable flag object; when `useFallback` is true the fallback slot renders
 * @returns A Vue component suitable for `global.stubs.Deferred`
 */
export function createDeferredStub(
  state: DeferredStubState = { useFallback: false },
): Component {
  return defineComponent({
    // eslint-disable-next-line vue/multi-word-component-names -- must match Inertia's real `Deferred` export
    name: 'Deferred',
    props: {
      data: { type: [String, Array], required: false, default: undefined },
    },
    setup(_, { slots }) {
      return () =>
        h('div', state.useFallback ? slots.fallback?.() : slots.default?.())
    },
  })
}
