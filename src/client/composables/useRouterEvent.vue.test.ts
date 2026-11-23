import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRouterEvent } from './useRouterEvent'

const mocks = vi.hoisted(() => ({
  removeListener: vi.fn(),
  routerOn: vi.fn(),
}))

vi.mock('@inertiajs/vue3', () => ({
  router: {
    on: mocks.routerOn,
  },
}))

describe('useRouterEvent', () => {
  beforeEach(() => {
    mocks.routerOn.mockReturnValue(mocks.removeListener)
  })

  function mountWithRouterEvent() {
    const callback = vi.fn()
    const component = defineComponent({
      setup() {
        useRouterEvent('navigate', callback)
      },
      template: '<div />',
    })
    return { wrapper: mount(component), callback }
  }

  it('registers the callback for the given router event', () => {
    const { callback } = mountWithRouterEvent()

    expect(mocks.routerOn).toHaveBeenCalledTimes(1)
    expect(mocks.routerOn).toHaveBeenCalledWith('navigate', callback)
  })

  it('removes the listener when the component is unmounted', () => {
    const { wrapper } = mountWithRouterEvent()

    expect(mocks.removeListener).not.toHaveBeenCalled()

    wrapper.unmount()

    expect(mocks.removeListener).toHaveBeenCalledTimes(1)
  })
})
