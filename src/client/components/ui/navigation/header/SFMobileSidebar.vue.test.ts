import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import SFShopSwitcher from '@client/components/shopSwitcher/SFShopSwitcher.vue'
import type { NavigationItem } from '@scayle/storefront/types'
import SFMobileNavigation from './SFMobileNavigation.vue'
import SFMobileSidebar from './SFMobileSidebar.vue'

const pagePropsRef = reactive<{ customer?: { email: string } }>({
  customer: undefined,
})

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  removeListener: vi.fn(),
  beforeCallback: undefined as
    ((event: { detail: Record<string, unknown> }) => void) | undefined,
}))

vi.mock('@client/composables/useAuthentication', () => ({
  useAuthentication: () => ({
    logout: mocks.logout,
  }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual =
    await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')

  return {
    ...actual,
    usePage: () => ({
      props: pagePropsRef,
      url: '/',
    }),
    router: {
      on: (
        event: string,
        callback: (event: { detail: Record<string, unknown> }) => void,
      ) => {
        if (event === 'before') {
          mocks.beforeCallback = callback
        }
        return mocks.removeListener
      },
    },
  }
})

const navItem: NavigationItem = {
  id: 1,
  name: 'Home',
  href: '/',
  openInNewWindow: false,
  children: [],
  icon: undefined,
  linkColor: undefined,
  disabled: false,
}

const globalConfig = {
  stubs: {
    SFSearchField: true,
    SFMobileNavigation: {
      props: ['isOpen', 'navigationItems'],
      emits: ['click-link'],
      template:
        '<div data-testid="mobile-navigation-stub" @click="$emit(\'click-link\')" />',
    },
    SFShopSwitcher: {
      props: ['placement'],
      template: '<div data-testid="shop-switcher-stub" />',
    },
    SFButton: {
      emits: ['click'],
      template:
        '<button data-testid="sf-button" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    IconUserSignout: { template: '<span />' },
  },
  mocks: {
    $t: (key: string) => key,
  },
}

const defaultProps = {
  id: 'mobile-sidebar',
  open: true,
  navigationItems: [navItem],
}

function mountSidebar(
  props: Partial<typeof defaultProps & { toggleElement: HTMLElement }> = {},
) {
  return mount(SFMobileSidebar, {
    props: { ...defaultProps, ...props },
    global: globalConfig,
  })
}

describe('SFMobileSidebar', () => {
  // happy-dom has no Popover API.
  beforeAll(() => {
    HTMLElement.prototype.showPopover = vi.fn()
    HTMLElement.prototype.hidePopover = vi.fn()
  })

  beforeEach(() => {
    pagePropsRef.customer = undefined
    mocks.logout.mockReset()
    mocks.beforeCallback = undefined
  })

  it('renders the sidebar root with the id the menu toggle controls', () => {
    const wrapper = mountSidebar()

    const root = wrapper.get('[data-testid="mobile-sidebar"]')
    expect(root.attributes('id')).toBe('mobile-sidebar')
    expect(wrapper.find('[data-testid="search-mobile"]').exists()).toBe(true)
  })

  it('keeps a closed sidebar out of reach of keyboard and assistive technology', () => {
    expect(
      mountSidebar({ open: false })
        .get('[data-testid="mobile-sidebar"]')
        .attributes('inert'),
    ).toBeDefined()
    expect(
      mountSidebar().get('[data-testid="mobile-sidebar"]').attributes('inert'),
    ).toBeUndefined()
  })

  it('shows itself with the menu toggle as the popover source', () => {
    const toggleElement = document.createElement('button')

    mountSidebar({ toggleElement })

    expect(HTMLElement.prototype.showPopover).toHaveBeenCalledWith({
      source: toggleElement,
    })
  })

  it('forwards open state and navigation items to SFMobileNavigation', () => {
    const wrapper = mountSidebar({ open: false, navigationItems: [navItem] })

    const navigation = wrapper.getComponent(SFMobileNavigation)
    expect(navigation.props('isOpen')).toBe(false)
    expect(navigation.props('navigationItems')).toEqual([navItem])
  })

  it('renders the shop switcher in the sidebar placement', () => {
    const wrapper = mountSidebar()

    const shopSwitcher = wrapper.getComponent(SFShopSwitcher)
    expect(shopSwitcher.props('placement')).toBe('sidebar')
  })

  it('shows the logout control only when a customer is signed in', () => {
    const loggedOut = mountSidebar()
    expect(loggedOut.find('[data-testid="logout-button"]').exists()).toBe(false)

    pagePropsRef.customer = { email: 'john@example.com' }
    const loggedIn = mountSidebar()
    expect(loggedIn.find('[data-testid="logout-button"]').exists()).toBe(true)
    expect(loggedIn.get('[data-testid="logout-button"]').text()).toContain(
      'common.sign_out',
    )
  })

  it('emits close when mobile navigation reports a link click', async () => {
    const wrapper = mountSidebar()

    await wrapper.get('[data-testid="mobile-navigation-stub"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close after a successful logout', async () => {
    pagePropsRef.customer = { email: 'john@example.com' }
    mocks.logout.mockResolvedValue(true)

    const wrapper = mountSidebar()
    await wrapper.get('[data-testid="logout-button"]').trigger('click')

    expect(mocks.logout).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not emit close when logout fails', async () => {
    pagePropsRef.customer = { email: 'john@example.com' }
    mocks.logout.mockResolvedValue(false)

    const wrapper = mountSidebar()
    await wrapper.get('[data-testid="logout-button"]').trigger('click')

    expect(mocks.logout).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  const fireBefore = (
    visit: Partial<{
      only: string[]
      except: string[]
      reset: string[]
      prefetch: boolean
    }> = {},
  ) =>
    mocks.beforeCallback?.({
      detail: {
        visit: { only: [], except: [], reset: [], prefetch: false, ...visit },
      },
    })

  // The sidebar's own links reload props in place through `useBasket`,
  // `useWishlist` and `useCustomer`, and a prefetch fetches another page
  // without leaving this one. Neither is the user navigating away.
  it.each([
    { case: 'a prefetch', visit: { prefetch: true } },
    { case: 'a reload of only some props', visit: { only: ['wishlist'] } },
    { case: 'a reload excluding props', visit: { except: ['basket'] } },
    { case: 'a reload resetting props', visit: { reset: ['products'] } },
  ])('stays open through $case', ({ visit }) => {
    const wrapper = mountSidebar()

    fireBefore(visit)

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('emits close when the user navigates to another page', () => {
    const wrapper = mountSidebar()

    fireBefore()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // Inertia fires no `before` event for history navigations, and the open flag
  // lives in the persistent layout, so without this the sidebar covers the page
  // the user went back to.
  it('emits close when the user goes back in history', () => {
    const wrapper = mountSidebar()

    window.dispatchEvent(new PopStateEvent('popstate'))

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits nothing on a history navigation while closed', () => {
    const wrapper = mountSidebar({ open: false })

    window.dispatchEvent(new PopStateEvent('popstate'))

    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
