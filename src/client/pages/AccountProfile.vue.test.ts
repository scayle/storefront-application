import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { Ref } from 'vue'
import type { SEOMeta } from '@shared/types/SEO'
import { SFAccountLayoutStub } from '../../test/utils/stubs'
import AccountProfile from './AccountProfile.vue'

const mocks = vi.hoisted(() => ({
  deferredState: { useFallback: false },
  customerRef: null as Ref<{ firstName?: string } | undefined> | null,
}))

vi.mock('@inertiajs/vue3', async () => {
  const vue = await import('vue')
  return {
    Deferred: vue.defineComponent({
      name: 'Deferred',
      props: { data: { type: [String, Array], required: false } },
      setup(_, { slots }) {
        return () =>
          vue.h(
            'div',
            mocks.deferredState.useFallback
              ? slots.fallback?.()
              : slots.default?.(),
          )
      },
    }),
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: { name?: string }) =>
      params?.name ? `${key} ${params.name}` : key,
  }),
}))

vi.mock('@client/composables/useCustomer', () => {
  mocks.customerRef = ref<{ firstName?: string } | undefined>(undefined)
  return { useCustomer: () => ({ customer: mocks.customerRef }) }
})

const SFProfileSkeletonLoaderStub = defineComponent({
  name: 'SFProfileSkeletonLoader',
  setup() {
    return () => h('div', { 'data-testid': 'profile-skeleton' })
  },
})

const globalConfig = {
  stubs: {
    SFAccountLayout: SFAccountLayoutStub,
    SFProfileAccountInformation: true,
    SFProfilePersonalInformation: true,
    SFProfilePasswordManagement: true,
    SFProfileSkeletonLoader: SFProfileSkeletonLoaderStub,
    PageMetaHead: true,
  },
  mocks: {
    $t: (key: string, params?: { name?: string }) =>
      params?.name ? `${key} ${params.name}` : key,
  },
}

const meta: SEOMeta = {
  title: 'Profile',
  robots: 'noindex, nofollow',
}

describe('AccountProfile page', () => {
  beforeEach(() => {
    mocks.deferredState.useFallback = false
    if (mocks.customerRef) {
      mocks.customerRef.value = undefined
    }
  })

  it('renders the greeting and profile sections once the customer resolves', () => {
    mocks.customerRef!.value = { firstName: 'Ada' }

    const wrapper = mount(AccountProfile, {
      props: { meta },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="profile-headline"]').text()).toBe(
      'account.profile.title',
    )
    // The greeting carries the resolved customer's first name.
    expect(wrapper.get('[data-testid="profile-greeting"]').text()).toBe(
      'common.welcome Ada',
    )
    expect(wrapper.find('[data-testid="profile-skeleton"]').exists()).toBe(
      false,
    )
  })

  it('renders the skeleton loader while the customer prop is deferred', () => {
    mocks.deferredState.useFallback = true

    const wrapper = mount(AccountProfile, {
      props: { meta },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="profile-skeleton"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="profile-headline"]').exists()).toBe(
      false,
    )
  })
})
