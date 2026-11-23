import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { SFLinkStub } from '@test/stubs/common'
import SFBackButton from './SFBackButton.vue'

const mounted = ref(true)
vi.mock(import('@vueuse/core'), async (importOriginal) => ({
  ...(await importOriginal()),
  useMounted: () => mounted,
}))

// Stub SFLink to a native anchor so we can assert the resolved `to` target
// without pulling in the routing/config composables.
const stubs = { SFLink: SFLinkStub }

const mountButton = (props = {}, slots = {}) =>
  mount(SFBackButton, {
    props,
    slots,
    global: { stubs, mocks: { $t: (key: string) => key } },
  })

afterEach(() => {
  mounted.value = true
})

describe('SFBackButton', () => {
  it('renders an icon-only link to `to` named by the default back label', () => {
    const wrapper = mountButton({ to: '/orders' })

    const anchor = wrapper.get('a')
    expect(anchor.attributes('href')).toBe('/orders')
    expect(anchor.attributes('aria-label')).toBe('global.back')
    expect(anchor.text()).toBe('')
    // The icon-only control keeps a 40×40 target.
    expect(anchor.classes()).toEqual(expect.arrayContaining(['h-10', 'w-10']))
  })

  it('takes its accessible name from the visible label when one is given', () => {
    const wrapper = mountButton({ to: '/' }, { default: 'Back to shop' })

    const anchor = wrapper.get('a')
    expect(anchor.text()).toBe('Back to shop')
    expect(anchor.attributes('aria-label')).toBeUndefined()
  })

  it('honours an explicit aria-label override', () => {
    const wrapper = mountButton({ to: '/', ariaLabel: 'Go back' })
    expect(wrapper.find('a').attributes('aria-label')).toBe('Go back')
  })

  it('navigates through browser history when useHistoryBack and history exists', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3)
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})

    const wrapper = mountButton({
      useHistoryBack: true,
      fallbackLink: '/category',
    })

    // Renders a real button (not a link) in history-back mode.
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('a').exists()).toBe(false)

    await wrapper.find('button').trigger('click')
    expect(back).toHaveBeenCalledOnce()
  })

  it('falls back to a link to fallbackLink when no history is available', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1)

    const wrapper = mountButton({
      useHistoryBack: true,
      fallbackLink: '/category',
    })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('a').attributes('href')).toBe('/category')
  })

  it('renders a link on SSR (not mounted) even in history-back mode', () => {
    mounted.value = false
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3)

    const wrapper = mountButton({
      useHistoryBack: true,
      fallbackLink: '/category',
    })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('a').attributes('href')).toBe('/category')
  })
})
