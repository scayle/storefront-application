import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCheckoutWebComponentScript } from './useCheckoutWebComponentScript'

const SCRIPT_SELECTOR = 'script[data-checkout-web-component-script]'

vi.mock('./useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: {
      value: {
        config: { tenantSpace: 'example' },
        country: { shopCountryId: 1001 },
      },
    },
  }),
}))

const TestComponent = defineComponent({
  setup() {
    useCheckoutWebComponentScript()
    return {}
  },
  template: '<div></div>',
})

describe('useCheckoutWebComponentScript', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('appends the script with the URL built from config', () => {
    mount(TestComponent)

    const script = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR)
    expect(script).not.toBeNull()
    expect(script!.src).toBe(
      'https://example.checkout.api.scayle.cloud/frontend/checkout-wc/js?appId=1001',
    )
    expect(script!.crossOrigin).toBe('anonymous')
    expect(script!.referrerPolicy).toBe('no-referrer')
  })

  it('does not set a fetchpriority hint that would outrank the LCP image', () => {
    mount(TestComponent)

    const script = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR)
    expect(script!.hasAttribute('fetchpriority')).toBe(false)
  })

  it('appends the script only once across multiple callers', () => {
    mount(TestComponent)
    mount(TestComponent)

    expect(document.querySelectorAll(SCRIPT_SELECTOR)).toHaveLength(1)
  })
})
