import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, h } from 'vue'
import type { Slots } from 'vue'
import { loadGtmWhenIdle } from '@client/utils/gtmBootstrap'
import SFAnalyticsHead from './SFAnalyticsHead.vue'

// Inertia's `Head` teleports into `document.head` through a head manager that
// only exists inside a mounted Inertia app. Rendering its slot in place is
// enough to inspect the script tags it would have hoisted.
vi.mock('@inertiajs/vue3', () => ({
  Head: {
    name: 'Head',
    setup:
      (_props: unknown, { slots }: { slots: Slots }) =>
      () =>
        h('div', slots.default?.()),
  },
}))

const shopConfig = vi.hoisted(() => ({
  gtmId: 'GTM-TEST' as string | undefined,
  consentManagementRequired: true,
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: computed(() => ({
      config: {
        publicFields: { gtmId: shopConfig.gtmId, userCentricsAppId: 'UC-TEST' },
      },
      country: {
        publicFields: {
          consentManagementRequired: shopConfig.consentManagementRequired,
        },
      },
    })),
  }),
}))

vi.mock('@client/utils/gtmBootstrap', () => ({
  loadGtmWhenIdle: vi.fn(),
}))

describe('SFAnalyticsHead', () => {
  beforeEach(() => {
    shopConfig.gtmId = 'GTM-TEST'
    shopConfig.consentManagementRequired = true
  })

  it('renders src-only script tags, so the CSP needs no unsafe-inline', async () => {
    // The `script-src` policy in `server/middleware/securityHeaders.ts` omits
    // `'unsafe-inline'`, which only holds while every script this component
    // renders loads from a URL. An inline body here would silently break it.
    const wrapper = mount(SFAnalyticsHead)
    await wrapper.vm.$nextTick()

    const scripts = wrapper.element.querySelectorAll('script')
    expect(scripts.length).toBeGreaterThan(0)
    for (const script of scripts) {
      expect(script.getAttribute('src')).toBeTruthy()
      expect(script.textContent?.trim()).toBe('')
    }
  })

  it('leaves GTM out of the document head', async () => {
    const wrapper = mount(SFAnalyticsHead)
    await wrapper.vm.$nextTick()

    expect(
      wrapper.element.querySelector('script[src*="googletagmanager.com"]'),
    ).toBeNull()
  })

  it('schedules the GTM container when a gtmId is set', () => {
    mount(SFAnalyticsHead)

    expect(vi.mocked(loadGtmWhenIdle)).toHaveBeenCalledWith('GTM-TEST')
  })

  it('renders no consent manager script when the country does not require consent management', async () => {
    shopConfig.consentManagementRequired = false
    const wrapper = mount(SFAnalyticsHead)
    await wrapper.vm.$nextTick()

    expect(wrapper.element.querySelector('script')).toBeNull()
  })

  it('schedules no GTM container without a gtmId', () => {
    shopConfig.gtmId = undefined
    mount(SFAnalyticsHead)

    expect(vi.mocked(loadGtmWhenIdle)).not.toHaveBeenCalled()
  })
})
