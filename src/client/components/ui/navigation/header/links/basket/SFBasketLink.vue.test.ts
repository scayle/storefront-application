import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Ref } from 'vue'
import { routes } from '@shared/routes'
import SFBasketLink from './SFBasketLink.vue'

// A real ref so the template unwraps `count` like the composable does.
const mocks = vi.hoisted(() => ({
  count: null as unknown as Ref<number>,
}))

vi.mock('@client/composables/useBasket', async () => {
  const { ref } = await import('vue')
  mocks.count = ref(0)
  return { useBasket: () => ({ count: mocks.count }) }
})

const stubs = {
  SFLink: {
    props: ['to'],
    template: '<a :href="to" v-bind="$attrs"><slot /></a>',
  },
  SFCountBadge: true,
}

const mountLink = () =>
  mount(SFBasketLink, {
    global: { stubs, mocks: { $t: (key: string) => key } },
  })

describe('SFBasketLink', () => {
  beforeEach(() => {
    mocks.count.value = 0
  })

  it('links to the basket page', () => {
    const link = mountLink().get('[data-testid="basket-link"]')

    expect(link.attributes('href')).toBe(routes.basket)
    expect(link.attributes('aria-label')).toBe('basket_page.a11y.title')
  })

  // `SFSkipLink` renders `href="#header-basket"`, and its own test only asserts
  // that href — so without this the target can disappear with the suite green
  // and "Skip to basket" silently stops working for keyboard users.
  it('carries the id the "Skip to basket" link targets', () => {
    const link = mountLink().get('[data-testid="basket-link"]')

    expect(link.attributes('id')).toBe('header-basket')
  })

  it('passes the basket count to the badge', () => {
    mocks.count.value = 3

    expect(
      mountLink().findComponent({ name: 'SFCountBadge' }).props('count'),
    ).toBe(3)
  })
})
