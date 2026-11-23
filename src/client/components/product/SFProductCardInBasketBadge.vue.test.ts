import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SFProductCardInBasketBadge from './SFProductCardInBasketBadge.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// `basket` is a deferred prop, so `hasProductInBasket` flips from `false` to
// `true` once it resolves. Tests set `isMountedOverride` to pin the pre- and
// post-mount render explicitly (a real `useMounted` only flips in `onMounted`,
// after the synchronous render `text()` reads), reusing the override pattern
// from `SFProductCard.vue.test.ts`.
const isMountedOverride = ref<boolean | undefined>(undefined)
const productInBasket = ref(false)
const isBasketPage = ref(false)

vi.mock('@vueuse/core', async () => {
  const actual =
    await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')
  return {
    ...actual,
    useMounted: () =>
      isMountedOverride.value === undefined
        ? actual.useMounted()
        : isMountedOverride,
  }
})

vi.mock('@client/composables/useBasket', () => ({
  useBasket: () => ({
    hasProductInBasket: () => productInBasket.value,
  }),
}))

vi.mock('@client/composables/usePageComponent', () => ({
  useIsPage: () => ({ isActive: isBasketPage }),
}))

const BADGE_LABEL = 'badge_labels.already_in_basket'

function mountBadge() {
  return mount(SFProductCardInBasketBadge, {
    props: { productId: 123 },
  })
}

describe('SFProductCardInBasketBadge', () => {
  afterEach(() => {
    isMountedOverride.value = undefined
    productInBasket.value = false
    isBasketPage.value = false
  })

  it('renders the badge when the product is in the basket', () => {
    isMountedOverride.value = true
    productInBasket.value = true
    expect(mountBadge().text()).toBe(BADGE_LABEL)
  })

  it('renders nothing when the product is not in the basket', () => {
    isMountedOverride.value = true
    productInBasket.value = false
    expect(mountBadge().text()).toBe('')
  })

  it('renders nothing on the basket page even when the product is in the basket', () => {
    isMountedOverride.value = true
    productInBasket.value = true
    isBasketPage.value = true
    expect(mountBadge().text()).toBe('')
  })

  it('renders nothing before mount so the first client render matches SSR', () => {
    // Server has the deferred basket unresolved (no badge). Inside an async
    // subtree the client can hydrate after the basket resolved, so gating on
    // `isMounted` keeps the initial render empty and avoids a hydration mismatch.
    isMountedOverride.value = false
    productInBasket.value = true
    expect(mountBadge().text()).toBe('')

    isMountedOverride.value = true
    expect(mountBadge().text()).toBe(BADGE_LABEL)
  })
})
