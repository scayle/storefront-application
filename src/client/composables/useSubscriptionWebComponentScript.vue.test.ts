import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSubscriptionOrigin } from '@scayle/storefront/shared'
import { useSubscriptionWebComponentScript } from './useSubscriptionWebComponentScript'

const mockConfig = {
  config: {
    tenantSpace: 'example',
  },
}

vi.mock('./useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: {
      get value() {
        return mockConfig
      },
    },
  }),
}))

const scriptSelector = (variant: 'overview' | 'cancellation') =>
  `script[data-subscription-web-component-script-${variant}]`

const mountHost = (variant: 'overview' | 'cancellation') =>
  mount(
    defineComponent({
      setup() {
        useSubscriptionWebComponentScript(variant)
        return {}
      },
      template: '<div></div>',
    }),
  )

describe('useSubscriptionWebComponentScript', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it.for(['overview', 'cancellation'] as const)(
    'appends the $variant script built on the subscription origin for the tenant space',
    (variant) => {
      mountHost(variant)

      const script = document.querySelector<HTMLScriptElement>(
        scriptSelector(variant),
      )
      // The origin comes from the SDK's `getSubscriptionOrigin`, the path from
      // the composable, so a fork only edits whichever one it changes.
      expect(script?.src).toBe(
        `${getSubscriptionOrigin(mockConfig.config.tenantSpace)}/libs/subscription-${variant}/latest/subscription-${variant}.umd.js`,
      )
    },
  )

  it('injects the script only once when the composable runs twice', () => {
    mount(
      defineComponent({
        setup() {
          useSubscriptionWebComponentScript('overview')
          useSubscriptionWebComponentScript('overview')
          return {}
        },
        template: '<div></div>',
      }),
    )

    const scripts = document.querySelectorAll(scriptSelector('overview'))
    expect(scripts).toHaveLength(1)
  })

  it('sets the crossOrigin and referrerPolicy attributes without a fetch priority', () => {
    mountHost('overview')

    const script = document.querySelector(
      scriptSelector('overview'),
    ) as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script!.crossOrigin).toBe('anonymous')
    expect(script!.referrerPolicy).toBe('no-referrer')
    // The script must not outrank the page's own LCP resource.
    expect(script!.hasAttribute('fetchpriority')).toBe(false)
  })
})
