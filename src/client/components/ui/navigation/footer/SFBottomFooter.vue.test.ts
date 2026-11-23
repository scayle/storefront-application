import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { NavigationItem } from '@scayle/storefront/types'
import SFBottomFooter from './SFBottomFooter.vue'

const mountedRef = ref(false)
let pageComponent = 'Home'

const consentManager = vi.hoisted(() => ({
  consentManagementRequired: false,
  openConsentManager: vi.fn(),
}))

vi.mock(import('@vueuse/core'), async (importOriginal) => ({
  ...(await importOriginal()),
  useMounted: () => mountedRef,
}))

vi.mock('@client/composables/useConsentManager', () => ({
  useConsentManager: () => consentManager,
}))

vi.mock('@client/composables/usePageComponent', () => ({
  useIsPage: (name: string) => ({
    isActive: computed(() => pageComponent === name),
  }),
}))

const tMock = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key

const globalConfig = {
  stubs: {
    SFNavigationTreeItem: {
      props: ['navigationItem'],
      template: '<a :href="navigationItem.href">{{ navigationItem.name }}</a>',
    },
    SFButton: { template: '<button><slot /></button>' },
  },
  mocks: { $t: tMock },
}

describe('SFBottomFooter', () => {
  afterEach(() => {
    consentManager.consentManagementRequired = false
    pageComponent = 'Home'
  })

  it('renders an empty year before mount so SSR and CSR match', () => {
    mountedRef.value = false
    const wrapper = mount(SFBottomFooter, {
      props: { navigationItems: [] },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="footer-copyright"]').text()).toBe(
      'footer.copyright:{"currentYear":""}',
    )
  })

  it('adds space below the footer on the PDP only, for the fixed mobile action bar', () => {
    const footerClasses = (page: string) => {
      pageComponent = page
      return mount(SFBottomFooter, {
        props: { navigationItems: [] },
        global: globalConfig,
      }).classes()
    }

    expect(footerClasses('ProductDetail')).not.toEqual(footerClasses('Home'))
  })

  it('fills in the current year after mount', async () => {
    mountedRef.value = false
    const wrapper = mount(SFBottomFooter, {
      props: { navigationItems: [] },
      global: globalConfig,
    })

    mountedRef.value = true
    await nextTick()

    expect(wrapper.get('[data-testid="footer-copyright"]').text()).toBe(
      `footer.copyright:{"currentYear":"${new Date().getFullYear()}"}`,
    )
  })

  it('renders a link for every legal navigation item', () => {
    const navigationItems: NavigationItem[] = [
      { id: 1, name: 'Imprint', href: '/imprint' },
      { id: 2, name: 'Privacy', href: '/privacy' },
    ].map((item) => ({
      ...item,
      openInNewWindow: false,
      children: [],
      disabled: false,
    }))

    const wrapper = mount(SFBottomFooter, {
      props: { navigationItems },
      global: globalConfig,
    })

    const links = wrapper.get('nav').findAll('a')
    expect(links.map((link) => [link.text(), link.attributes('href')])).toEqual(
      [
        ['Imprint', '/imprint'],
        ['Privacy', '/privacy'],
      ],
    )
  })

  it('opens the consent manager from the privacy settings button when consent management is required', async () => {
    consentManager.consentManagementRequired = true
    const wrapper = mount(SFBottomFooter, {
      props: { navigationItems: [] },
      global: globalConfig,
    })

    const button = wrapper.get('button')
    expect(button.text()).toBe('footer.privacy_settings')
    await button.trigger('click')

    expect(consentManager.openConsentManager).toHaveBeenCalledOnce()
  })

  it('hides the privacy settings button when consent management is not required', () => {
    const wrapper = mount(SFBottomFooter, {
      props: { navigationItems: [] },
      global: globalConfig,
    })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
