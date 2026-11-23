import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorefrontCountry } from '@scayle/storefront/test'
import SFRangeInput from './SFRangeInput.vue'

const deCountry = createMockStorefrontCountry({
  locale: 'de-DE',
  currency: { currencyCode: 'EUR' },
})

const gbCountry = createMockStorefrontCountry({
  locale: 'en-GB',
  currency: { currencyCode: 'GBP' },
})

function mountInput(
  overrides: Partial<InstanceType<typeof SFRangeInput>['$props']> = {},
) {
  return mount(SFRangeInput, {
    props: {
      variant: 'price',
      modelValue: 5000,
      currencyCode: overrides.currencyCode ?? gbCountry.currency.currencyCode,
      country: overrides.country ?? gbCountry,
      min: 0,
      max: 100_000,
      ...overrides,
    },
  })
}

describe('SFRangeInput', () => {
  it.for([
    { variant: 'price', modelValue: 5000, formatted: '£50.00', plain: '50' },
    { variant: 'percentage', modelValue: 25, formatted: '25%', plain: '25' },
  ] as const)(
    'shows the formatted $variant at rest and the plain number while focused',
    async ({ variant, modelValue, formatted, plain }) => {
      const wrapper = mountInput({ variant, modelValue })
      const input = wrapper.get('input')

      expect(input.element.value).toBe(formatted)
      await input.trigger('focus')
      expect(input.element.value).toBe(plain)
      await input.trigger('blur')
      expect(input.element.value).toBe(formatted)
    },
  )

  // Typed values round to the whole major unit before conversion to minor units.
  it.for([
    { input: '13,49', country: deCountry, expected: 1300 },
    // `.` groups thousands in German, so `1.234` is 1234, not 1.234.
    { input: '1.234', country: deCountry, expected: 123400 },
    { input: '1.234,56', country: deCountry, expected: 123500 },
    { input: '£1,234', country: gbCountry, expected: 123400 },
    {
      input: '30%',
      country: gbCountry,
      variant: 'percentage',
      expected: 30,
    },
  ] as const)(
    'parses "$input" in $country.locale to $expected',
    ({ input: typed, country, variant, expected }) => {
      const wrapper = mountInput({
        country,
        currencyCode: country.currency.currencyCode,
        variant: variant ?? 'price',
        max: 1_000_000,
      })
      const input = wrapper.get('input')

      input.element.value = typed
      input.trigger('change')

      expect(wrapper.emitted('update:modelValue')).toEqual([[expected]])
    },
  )

  it('emits `clamp` and the adjusted value when the input exceeds max', () => {
    const wrapper = mountInput({
      max: 5000,
      modelValue: 2000,
      country: gbCountry,
    })
    const input = wrapper.get('input')

    input.element.value = '99'
    input.trigger('change')

    expect(wrapper.emitted('clamp')).toEqual([
      [{ requested: 9900, applied: 5000 }],
    ])
    expect(wrapper.emitted('update:modelValue')).toEqual([[5000]])
  })

  it('emits `clamp` and the adjusted value when the input falls below min', () => {
    const wrapper = mountInput({ min: 1000, modelValue: 2000 })
    const input = wrapper.get('input')

    input.element.value = '5'
    input.trigger('change')

    expect(wrapper.emitted('clamp')).toEqual([
      [{ requested: 500, applied: 1000 }],
    ])
    expect(wrapper.emitted('update:modelValue')).toEqual([[1000]])
  })

  it('emits nothing when the input cannot be parsed', () => {
    const wrapper = mountInput()
    const input = wrapper.get('input')

    input.element.value = 'not a number'
    input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('clamp')).toBeUndefined()
  })

  it('does not emit update when the parsed value equals the current model', () => {
    const wrapper = mountInput({ modelValue: 5000 })
    const input = wrapper.get('input')

    input.element.value = '50'
    input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
