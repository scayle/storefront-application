import { describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import type { CentAmount } from '@scayle/storefront-api'
import { ANALYTICS_INJECTION_KEY } from '@client/plugins/analyticsKey'
import type { AnalyticsPlugin } from '@client/plugins/analyticsKey'
import { useAnalytics } from './useAnalytics'

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
}))

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({ error: mocks.error }),
}))

const useAnalyticsInApp = (plugin?: AnalyticsPlugin) => {
  const app = createApp({})
  if (plugin) {
    app.provide(ANALYTICS_INJECTION_KEY, plugin)
  }
  return app.runWithContext(() => useAnalytics())
}

describe('useAnalytics', () => {
  it('logs an error when the plugin is not installed', () => {
    // Vue warns that the injection was not found, which is the condition
    // under test.
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { track } = useAnalyticsInApp()
    track('view_page')

    expect(mocks.error).toHaveBeenCalledExactlyOnceWith({
      message: 'SCAYLE Analytics plugin not installed',
    })
  })

  it('forwards the event name and properties to the plugin', () => {
    const plugin = { track: vi.fn() }
    const { track } = useAnalyticsInApp(plugin)

    const properties = {
      product_id: 'p-1',
      price: 8995 as CentAmount,
      product_list_type: 'category',
      position: 3,
    } as const

    track('select_product', properties)

    expect(plugin.track).toHaveBeenCalledExactlyOnceWith(
      'select_product',
      properties,
    )
  })

  it('forwards an event without properties', () => {
    const plugin = { track: vi.fn() }
    const { track } = useAnalyticsInApp(plugin)

    track('view_page')

    expect(plugin.track).toHaveBeenCalledExactlyOnceWith('view_page')
  })
})
