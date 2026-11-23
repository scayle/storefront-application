import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { AppliedFilters } from '@scayle/storefront/types'
import SFFilterSlideIn from './SFFilterSlideIn.vue'

// Captures the router handlers so tests can fire Inertia events directly.
const routerHandlers = vi.hoisted(
  () => new Map<string, (event: unknown) => void>(),
)

vi.mock('@client/composables/useRouterEvent', () => ({
  useRouterEvent: (event: string, callback: (event: unknown) => void) => {
    routerHandlers.set(event, callback)
  },
}))

// The toast decision is tested in `useFilter.test.ts`. The binding tests pin
// the template bindings that feed it, which no other test covers.
const { onSlideInOpen, onSlideInClose } = vi.hoisted(() => ({
  onSlideInOpen: vi.fn(),
  onSlideInClose: vi.fn(),
}))

vi.mock('@client/composables/useFilter', () => ({
  useFilter: () => ({ onSlideInOpen, onSlideInClose }),
}))

const appliedFilter: AppliedFilters = {
  attributes: {},
  booleans: {},
  count: 0,
}

const contentMounted = vi.fn()

const mountFilterSlideIn = () =>
  mount(SFFilterSlideIn, {
    props: { open: true, appliedFilter, productListType: 'category' },
    global: {
      stubs: {
        SFSlideIn: {
          name: 'SFSlideIn',
          emits: ['open', 'close'],
          template: '<div><slot /><slot name="footer" /></div>',
        },
        SFFilterSlideInContent: {
          template: '<div />',
          mounted: contentMounted,
        },
        SFFilterActions: true,
      },
      mocks: { $t: (key: string) => key },
    },
  })

describe('SFFilterSlideIn', () => {
  it('calls onSlideInOpen when the slide-in opens', () => {
    mountFilterSlideIn().findComponent({ name: 'SFSlideIn' }).vm.$emit('open')

    expect(onSlideInOpen).toHaveBeenCalledOnce()
    expect(onSlideInClose).not.toHaveBeenCalled()
  })

  it('calls onSlideInClose when the slide-in closes', () => {
    mountFilterSlideIn().findComponent({ name: 'SFSlideIn' }).vm.$emit('close')

    expect(onSlideInClose).toHaveBeenCalledOnce()
    expect(onSlideInOpen).not.toHaveBeenCalled()
  })

  it.for(['httpException', 'networkError'])(
    'remounts its content after a %s',
    async (event) => {
      mountFilterSlideIn()
      expect(contentMounted).toHaveBeenCalledTimes(1)

      routerHandlers.get(event)?.({})
      await nextTick()

      expect(contentMounted).toHaveBeenCalledTimes(2)
    },
  )
})
