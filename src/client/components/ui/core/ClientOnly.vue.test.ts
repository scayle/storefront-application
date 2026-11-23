import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from '@vue/server-renderer'
import ClientOnly from './ClientOnly.vue'

const slots = {
  default: () => h('span', { 'data-testid': 'client' }),
  fallback: () => h('span', { 'data-testid': 'fallback' }),
}

/** Renders the component without mounting it, mirroring the SSR pass. */
const renderUnmounted = (withFallback: boolean) =>
  renderToString(
    createSSRApp({
      render: () =>
        h(ClientOnly, null, withFallback ? slots : { default: slots.default }),
    }),
  )

describe('ClientOnly', () => {
  it('starts unmounted: renders nothing during SSR when no fallback is given', async () => {
    const html = await renderUnmounted(false)
    expect(html).not.toContain('data-testid="client"')
    expect(html).not.toContain('data-testid="fallback"')
  })

  it('starts unmounted: renders the fallback slot during SSR when provided', async () => {
    const html = await renderUnmounted(true)
    expect(html).toContain('data-testid="fallback"')
    expect(html).not.toContain('data-testid="client"')
  })

  it('flips to the default slot after onMounted', async () => {
    const wrapper = mount(ClientOnly, { slots })
    // The mount hook sets the flag; the re-render lands on the next tick.
    await nextTick()
    expect(wrapper.find('[data-testid="client"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="fallback"]').exists()).toBe(false)
  })
})
