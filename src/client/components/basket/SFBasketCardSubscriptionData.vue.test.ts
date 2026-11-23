import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import type { VueWrapper } from '@vue/test-utils'
import type {
  SubscriptionDefinition,
  VariantSubscription,
} from '@scayle/storefront/types'
import SFBasketCardSubscriptionData from './SFBasketCardSubscriptionData.vue'

// Real vue-i18n with the shipped subscription messages, so ordinal plural
// selection and caption interpolation are exercised the way they render.
const i18n = createI18n({
  legacy: false,
  locale: 'en-GB',
  messages: {
    'en-GB': {
      subscription: {
        label: 'Subscription',
        interval: 'Interval',
        follow_up_delivery: 'Follow-up delivery',
        day_of_month_selection_caption: '{dayOfMonth} of the month',
        ordinal_suffix: { one: 'st', two: 'nd', few: 'rd', other: 'th' },
      },
    },
  },
})

const stubs = {
  SFLabelValue: {
    template: `<p data-testid="label-value"><strong>{{ label }}</strong>: {{ value }}</p>`,
    props: ['label', 'value', 'tag'],
  },
}

const globalConfig = { stubs, plugins: [i18n] }

const variantSubscription: VariantSubscription = {
  intervals: [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Every 3 months', value: 'quarterly' },
  ],
  term: 'No_minimum_term',
  cancellationPolicy: 'Can_cancel_anytime',
}

const definition: SubscriptionDefinition = {
  subscriptionInterval: 'monthly',
  subscriptionDeliveryDate: '15',
  subscriptionTerm: 'No_minimum_term',
  subscriptionCancellationPolicy: 'Can_cancel_anytime',
}

const rowTexts = (wrapper: VueWrapper) =>
  wrapper.findAll('[data-testid="label-value"]').map((row) => row.text())

describe('SFBasketCardSubscriptionData.vue', () => {
  it('renders nothing without a subscription definition', () => {
    const wrapper = mount(SFBasketCardSubscriptionData, {
      props: { subscription: variantSubscription },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="subscription-data"]').exists()).toBe(
      false,
    )
  })

  it('resolves the interval label from the variant intervals', () => {
    const wrapper = mount(SFBasketCardSubscriptionData, {
      props: { definition, subscription: variantSubscription },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="main-label"]').text()).toBe(
      'Subscription',
    )
    expect(rowTexts(wrapper)[0]).toBe('Interval: Monthly')
  })

  it.for([
    { variant: 'carries no intervals', subscription: { intervals: [] } },
    { variant: 'carries no subscription', subscription: undefined },
  ])(
    'falls back to the raw interval value when the variant $variant',
    ({ subscription }) => {
      const wrapper = mount(SFBasketCardSubscriptionData, {
        props: { definition, subscription },
        global: globalConfig,
      })

      expect(rowTexts(wrapper)[0]).toBe('Interval: monthly')
    },
  )

  it('renders the delivery day as an ordinal caption', () => {
    const wrapper = mount(SFBasketCardSubscriptionData, {
      props: { definition, subscription: variantSubscription },
      global: globalConfig,
    })

    expect(rowTexts(wrapper)[1]).toBe('Follow-up delivery: 15th of the month')
  })

  it.for([
    { date: 'unset', subscriptionDeliveryDate: undefined },
    { date: 'not a valid day of the month', subscriptionDeliveryDate: '32' },
  ])(
    'omits the delivery day row when the date is $date',
    ({ subscriptionDeliveryDate }) => {
      const wrapper = mount(SFBasketCardSubscriptionData, {
        props: {
          definition: {
            subscriptionInterval: 'monthly',
            subscriptionDeliveryDate,
          },
          subscription: variantSubscription,
        },
        global: globalConfig,
      })

      expect(rowTexts(wrapper)).toEqual(['Interval: Monthly'])
    },
  )

  it('never renders the term or the cancellation policy', () => {
    const wrapper = mount(SFBasketCardSubscriptionData, {
      props: { definition, subscription: variantSubscription },
      global: globalConfig,
    })

    expect(rowTexts(wrapper)).toHaveLength(2)
    expect(wrapper.text()).not.toContain('No_minimum_term')
    expect(wrapper.text()).not.toContain('Can_cancel_anytime')
  })
})
