import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SFSimpleHeader from './SFSimpleHeader.vue'

vi.mock('@assets/icons/logo/signet.svg', () => ({
  default: { name: 'IconLogoSignet', template: '<span />' },
}))

const globalConfig = {
  stubs: {
    SFLink: {
      props: ['to', 'raw'],
      template: '<a :href="to"><slot /></a>',
    },
    SFBackButton: { template: '<div />' },
    SFNavigationTreeItem: { template: '<span />' },
  },
  mocks: { $t: (key: string) => key },
}

describe('SFSimpleHeader', () => {
  it('names the navigation landmark', () => {
    const wrapper = mount(SFSimpleHeader, {
      props: { shopName: 'Storefront DE', navigationItems: [] },
      global: globalConfig,
    })

    expect(wrapper.get('nav').attributes('aria-label')).toBe(
      'navigation.a11y.header',
    )
  })

  it.for([
    { shopName: 'Test Shop', label: 'Test Shop' },
    { shopName: undefined, label: 'navigation.a11y.home_link' },
  ])(
    'labels the logo link "$label" when the shop name is $shopName',
    ({ shopName, label }) => {
      const wrapper = mount(SFSimpleHeader, {
        props: { shopName, navigationItems: [] },
        global: globalConfig,
      })

      expect(wrapper.find('a').attributes('aria-label')).toBe(label)
    },
  )
})
