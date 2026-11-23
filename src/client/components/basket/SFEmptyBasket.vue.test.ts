import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Customer } from '@scayle/storefront/types'
import { createMockCustomer } from '@test/mock-data/customers'
import { t } from '@test/mocks/vue-i18n'
import { SFLinkStub } from '@test/stubs/common'
import type { ReactivePageMock } from '@test/utils/inertia'
import { getSignInRoute, routes } from '@shared/routes'
import SFEmptyBasket from './SFEmptyBasket.vue'

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
  deferred: { useFallback: false },
}))

vi.mock('@inertiajs/vue3', async () => {
  const { createDeferredStub, createReactivePage } =
    await import('@test/utils/inertia')
  mocks.reactivePage = createReactivePage()
  return {
    Deferred: createDeferredStub(mocks.deferred),
    usePage: vi.fn(() => mocks.reactivePage),
  }
})

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const mountEmptyBasket = () =>
  mount(SFEmptyBasket, {
    global: {
      stubs: { SFLink: SFLinkStub, IconBasketEmpty: true },
      mocks: { $t: t },
    },
  })

describe('SFEmptyBasket', () => {
  beforeEach(() => {
    mocks.deferred.useFallback = false
    mocks.reactivePage!.props = {
      storefront: {
        config: { countrySelector: 'path' },
        country: { path: 'en', isDefault: false },
      },
      customer: null,
    }
  })

  it.for([
    {
      behavior: 'shows the sign-in button when the customer is logged out',
      customer: null,
      isLoaded: true,
      showsSignIn: true,
    },
    {
      behavior: 'hides the sign-in button while the customer is not loaded yet',
      customer: null,
      isLoaded: false,
      showsSignIn: false,
    },
    {
      behavior: 'hides the sign-in button when the customer is logged in',
      customer: createMockCustomer(),
      isLoaded: true,
      showsSignIn: false,
    },
  ] satisfies {
    behavior: string
    customer: Customer | null
    isLoaded: boolean
    showsSignIn: boolean
  }[])('$behavior', ({ customer, isLoaded, showsSignIn }) => {
    mocks.reactivePage!.props.customer = customer
    mocks.deferred.useFallback = !isLoaded

    const wrapper = mountEmptyBasket()

    expect(wrapper.find('[data-testid="button-signin"]').exists()).toBe(
      showsSignIn,
    )
  })

  // The stub renders the default slot whatever key it gets, so the key the
  // sign-in button waits for is checked here.
  it('waits for the deferred customer prop before deciding on the sign-in button', () => {
    const wrapper = mountEmptyBasket()

    expect(wrapper.findComponent({ name: 'Deferred' }).props('data')).toBe(
      'customer',
    )
  })

  it('sends a logged-out customer to sign in and back to the basket of their country', () => {
    const wrapper = mountEmptyBasket()

    expect(
      wrapper.get('[data-testid="button-signin"]').attributes('href'),
    ).toBe(getSignInRoute('/en/basket'))
  })

  it('links continue shopping to the home page', () => {
    const wrapper = mountEmptyBasket()

    expect(
      wrapper
        .get('[data-testid="button-continue-shopping"]')
        .attributes('href'),
    ).toBe(routes.home)
  })
})
