import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { routes } from '@shared/routes'
import { t } from '@test/mocks/vue-i18n'
import { SFLinkStub } from '@test/stubs/common'
import SFAccountLink from './SFAccountLink.vue'

const pagePropsRef = reactive<{
  customer?: { email?: string; firstName?: string; lastName?: string }
  storefront: {
    config: { countrySelector: 'path' }
    country: {
      path: string
      isDefault: boolean
      publicFields: { subscriptionEnabled: boolean }
    }
  }
}>({
  customer: undefined,
  storefront: {
    config: { countrySelector: 'path' },
    country: {
      path: 'en',
      isDefault: false,
      publicFields: { subscriptionEnabled: true },
    },
  },
})

const logoutMock = vi.hoisted(() => vi.fn())
const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

vi.mock(import('@client/composables/useRoute'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    useRoute: () => ({ ...actual.useRoute(), navigate: navigateMock }),
  }
})

vi.mock('@inertiajs/vue3', async () => {
  const actual =
    await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')

  return {
    ...actual,
    Deferred: {
      template: '<div><slot /></div>',
    },
    usePage: () => {
      return {
        props: pagePropsRef,
        url: '/current-page',
      }
    },
  }
})

vi.mock('@client/composables/useAuthentication', () => {
  return {
    useAuthentication: () => ({
      logout: logoutMock,
    }),
  }
})

describe('SFAccountLink', () => {
  beforeEach(() => {
    pagePropsRef.storefront.country.publicFields.subscriptionEnabled = true
  })

  const globalConfig = {
    stubs: {
      SFLink: SFLinkStub,
      SFPopover: {
        props: ['isOpen'],
        template: `<div
            data-testid="popoverContainer"
            @mouseenter="$emit('mouseenter')"
            @mouseleave="$emit('mouseleave')"
          >
            <slot name="action" />
            <slot v-if="isOpen" name="content" />
          </div>`,
      },
      SFButton: {
        props: ['to', 'variant', 'loading', 'disabled'],
        template:
          '<a v-if="to" :href="to"><slot name="icon" /><slot /></a><button v-else :disabled="disabled || loading" :data-loading="loading"><slot name="icon" /><slot /></button>',
      },
      IconUser: { template: '<span />' },
    },
    mocks: {
      $t: t,
      $page: {
        url: '/current-page',
      },
    },
  }

  it('renders only login button when logged out', async () => {
    pagePropsRef.customer = undefined

    const wrapper = mount(SFAccountLink, { global: globalConfig })

    // Open the popover to check content
    await wrapper.find('[data-testid="popoverContainer"]').trigger('mouseenter')

    expect(
      wrapper.find('[data-testid="account-popover-login-button"]').exists(),
    ).toBe(true)
    expect(wrapper.find('[data-testid="account-popover-user"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.find('[data-testid="account-popover-link-orders"]').exists(),
    ).toBe(false)
    expect(
      wrapper.find('[data-testid="account-popover-logout-button"]').exists(),
    ).toBe(false)
  })

  it('renders the customer email and logout instead of login when logged in', async () => {
    pagePropsRef.customer = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@scayle.com',
    }

    const wrapper = mount(SFAccountLink, { global: globalConfig })

    // Open the popover to check content
    await wrapper.find('[data-testid="popoverContainer"]').trigger('mouseenter')

    expect(wrapper.get('[data-testid="account-popover-email"]').text()).toBe(
      'john@scayle.com',
    )
    expect(
      wrapper.find('[data-testid="account-popover-logout-button"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="account-popover-login-button"]').exists(),
    ).toBe(false)
  })

  it('leaves out the subscriptions link when subscriptions are disabled for the shop', async () => {
    pagePropsRef.customer = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@scayle.com',
    }
    pagePropsRef.storefront.country.publicFields.subscriptionEnabled = false

    const wrapper = mount(SFAccountLink, { global: globalConfig })
    await wrapper.find('[data-testid="popoverContainer"]').trigger('mouseenter')

    expect(
      wrapper.find('[data-testid="account-popover-link-orders"]').exists(),
    ).toBe(true)
    expect(
      wrapper
        .find('[data-testid="account-popover-link-subscriptions"]')
        .exists(),
    ).toBe(false)
    expect(
      wrapper.find('[data-testid="account-popover-link-profile"]').exists(),
    ).toBe(true)
  })

  it('links point to the correct account routes', async () => {
    pagePropsRef.customer = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@scayle.com',
    }

    const wrapper = mount(SFAccountLink, { global: globalConfig })
    await wrapper.find('[data-testid="popoverContainer"]').trigger('mouseenter')

    expect(
      wrapper
        .get('[data-testid="account-popover-link-orders"]')
        .attributes('href'),
    ).toBe(routes.accountOrders)
    expect(
      wrapper
        .get('[data-testid="account-popover-link-subscriptions"]')
        .attributes('href'),
    ).toBe(routes.accountSubscriptions)
    expect(
      wrapper
        .get('[data-testid="account-popover-link-profile"]')
        .attributes('href'),
    ).toBe(routes.accountProfile)
  })

  it('closes the popover immediately on successful logout and shows logged-out state on re-hover', async () => {
    pagePropsRef.customer = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@scayle.com',
    }
    logoutMock.mockImplementation(() => {
      pagePropsRef.customer = undefined
      return Promise.resolve(true)
    })

    const wrapper = mount(SFAccountLink, { global: globalConfig })

    // Simulate opening the popover
    await wrapper.find('[data-testid="popoverContainer"]').trigger('mouseenter')

    const logoutButton = wrapper.find(
      '[data-testid="account-popover-logout-button"]',
    )
    await logoutButton.trigger('click')

    expect(wrapper.find('[data-testid="account-popover"]').exists()).toBe(false)

    // Re-hovering after logout shows the logged-out state (login button, not user info)
    await wrapper.find('[data-testid="popoverContainer"]').trigger('mouseenter')
    expect(
      wrapper.find('[data-testid="account-popover-login-button"]').exists(),
    ).toBe(true)
    expect(wrapper.find('[data-testid="account-popover-user"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.find('[data-testid="account-popover-logout-button"]').exists(),
    ).toBe(false)
  })

  it.for([
    { firstName: 'John', name: 'John' },
    { firstName: '  ', name: 'john@scayle.com' },
    { firstName: undefined, name: 'john@scayle.com' },
  ])(
    'welcomes the customer as $name when the first name is $firstName',
    async ({ firstName, name }) => {
      pagePropsRef.customer = { firstName, email: 'john@scayle.com' }

      const wrapper = mount(SFAccountLink, { global: globalConfig })
      await wrapper
        .find('[data-testid="popoverContainer"]')
        .trigger('mouseenter')

      expect(wrapper.get('[data-testid="account-popover-name"]').text()).toBe(
        t('common.welcome', { name }),
      )
    },
  )

  it('returns focus to the account trigger after a successful logout', async () => {
    pagePropsRef.customer = { firstName: 'John', email: 'john@scayle.com' }
    logoutMock.mockResolvedValue(true)

    const wrapper = mount(SFAccountLink, {
      global: globalConfig,
      attachTo: document.body,
    })
    await wrapper.find('[data-testid="popoverContainer"]').trigger('mouseenter')
    await wrapper
      .get('[data-testid="account-popover-logout-button"]')
      .trigger('click')
    await flushPromises()

    expect(document.activeElement).toBe(
      wrapper.get('[data-testid="account-popover-trigger"]').element,
    )
  })

  it('keeps the logged-in state when logout fails', async () => {
    pagePropsRef.customer = { firstName: 'John', email: 'john@scayle.com' }
    logoutMock.mockResolvedValue(false)

    const wrapper = mount(SFAccountLink, { global: globalConfig })
    const popover = wrapper.find('[data-testid="popoverContainer"]')
    await popover.trigger('mouseenter')
    await wrapper
      .get('[data-testid="account-popover-logout-button"]')
      .trigger('click')
    await popover.trigger('mouseenter')

    expect(wrapper.find('[data-testid="account-popover-user"]').exists()).toBe(
      true,
    )
    expect(
      wrapper.find('[data-testid="account-popover-login-button"]').exists(),
    ).toBe(false)
  })

  it('toggles the popover on a keyboard activation of the trigger', async () => {
    pagePropsRef.customer = { firstName: 'John', email: 'john@scayle.com' }
    const wrapper = mount(SFAccountLink, { global: globalConfig })
    const trigger = wrapper.get('[data-testid="account-popover-trigger"]')

    // A keyboard activation dispatches a click with `detail` 0.
    await trigger.trigger('click', { detail: 0 })

    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('navigates to the account page on a pointer click of the trigger', async () => {
    pagePropsRef.customer = { firstName: 'John', email: 'john@scayle.com' }
    const wrapper = mount(SFAccountLink, { global: globalConfig })
    const trigger = wrapper.get('[data-testid="account-popover-trigger"]')

    await trigger.trigger('click', { detail: 1 })

    expect(navigateMock).toHaveBeenCalledWith(`/en${routes.account}`)
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })
})
