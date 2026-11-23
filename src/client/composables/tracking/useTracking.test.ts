import { describe, expect, it, vi } from 'vitest'
import { computed, createApp } from 'vue'
import { TRACKING_INJECTION_KEY } from '@client/plugins/trackingKey'
import type { TrackingPlugin } from '@client/plugins/trackingKey'
import { useTracking } from './useTracking'

const mocks = vi.hoisted(() => ({
  logError: vi.fn(),
}))

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({ error: mocks.logError }),
}))

const useTrackingInApp = (plugin?: TrackingPlugin) => {
  const app = createApp({})
  if (plugin) {
    app.provide(TRACKING_INJECTION_KEY, plugin)
  }
  return app.runWithContext(() => useTracking())
}

describe('useTracking', () => {
  it('logs an error when the tracking plugin is not installed', () => {
    // Vue warns that the injection was not found, which is the condition
    // under test.
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { push } = useTrackingInApp()
    push({ event: 'add_to_cart' })

    expect(mocks.logError).toHaveBeenCalledExactlyOnceWith({
      message: 'Tracking plugin not installed',
    })
  })

  it('forwards events to the injected push implementation', () => {
    const plugin = { push: vi.fn(), context: computed(() => undefined) }
    const { push } = useTrackingInApp(plugin)

    push({
      event: 'add_to_cart',
      ecommerce: { items: [{ item_id: '123', quantity: 1 }] },
    })

    expect(plugin.push).toHaveBeenCalledExactlyOnceWith({
      event: 'add_to_cart',
      ecommerce: { items: [{ item_id: '123', quantity: 1 }] },
    })
  })
})
