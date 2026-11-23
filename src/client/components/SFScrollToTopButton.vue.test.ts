import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SFScrollToTopButton from './SFScrollToTopButton.vue'

const arrivedState = ref({ top: false })
// Spy on the target passed to `useScroll` so the SSR guard can be asserted
// directly. `useScroll` itself stays inert (it only returns `arrivedState`).
const useScroll = vi.fn((_target?: unknown) => ({ arrivedState }))
vi.mock('@vueuse/core', async () => {
  const actual = await vi.importActual('@vueuse/core')
  return {
    ...actual,
    useScroll: (target?: unknown) => useScroll(target),
  }
})

const tMock = vi.fn((key: string) => key)
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock }),
}))

describe('SFScrollToTopButton', () => {
  const defaultStubs = {
    SFFadeInTransition: {
      template: '<div><slot></slot></div>',
    },
    IconNavigationUp: { template: '<span></span>' },
  }

  const defaultGlobal = {
    stubs: defaultStubs,
    mocks: { $t: tMock },
  }

  it('should not be visible when scroll has arrived on top', () => {
    arrivedState.value = { top: true }
    const wrapper = mount(SFScrollToTopButton, {
      global: defaultGlobal,
    })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('should be visible when page is scrolled down', () => {
    arrivedState.value = { top: false }
    const wrapper = mount(SFScrollToTopButton, {
      global: defaultGlobal,
    })
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.isVisible()).toBe(true)
  })

  it('should scroll to top when clicked', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo')
    arrivedState.value = { top: false }
    const wrapper = mount(SFScrollToTopButton, {
      global: defaultGlobal,
    })
    const button = wrapper.find('button')

    await button.trigger('click')
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  // Regression guard for the SSR `ReferenceError`: `useScroll` runs at setup top
  // level, which also executes during SSR, so the bare `window` global must not
  // be referenced there.
  it('does not reference window as the scroll target during SSR', () => {
    vi.stubEnv('SSR', true)
    mount(SFScrollToTopButton, { global: defaultGlobal })
    expect(useScroll).toHaveBeenCalledWith(undefined)
  })

  it('uses window as the scroll target on the client', () => {
    vi.stubEnv('SSR', false)
    mount(SFScrollToTopButton, { global: defaultGlobal })
    expect(useScroll).toHaveBeenCalledWith(window)
  })
})
