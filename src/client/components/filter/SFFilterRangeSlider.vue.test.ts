import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import SFFilterRangeSlider from './SFFilterRangeSlider.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// Clamp announcements route through the shared announcer; assert against the spy.
const { announce } = vi.hoisted(() => ({ announce: vi.fn() }))
vi.mock('@client/composables/useAnnouncer', () => ({
  useAnnouncer: () => ({ announce }),
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    country: computed(() => ({
      locale: 'en-GB',
      currency: { currencyCode: 'GBP' },
    })),
  }),
}))

const stubs = {
  SFRangeSlider: {
    props: ['formatValue', 'modelValue'],
    template: `
      <div data-testid="range-slider" :data-tooltip="formatValue ? formatValue(modelValue[0]) : ''">
        <slot name="tooltip" :value="modelValue[0]" />
      </div>
    `,
  },
  SFRangeInput: {
    name: 'SFRangeInput',
    props: ['ariaLabel'],
    emits: ['update:modelValue', 'clamp'],
    template: `<input :data-testid="$attrs['data-testid'] ?? 'input'" :data-aria-label="ariaLabel" />`,
  },
}

function mountFilter(
  props: Partial<InstanceType<typeof SFFilterRangeSlider>['$props']> = {},
) {
  return mount(SFFilterRangeSlider, {
    props: {
      filterSlug: 'prices',
      modelValue: [1000, 5000],
      ...props,
    },
    global: { stubs, mocks: { $t: (k: string) => k } },
  })
}

describe('SFFilterRangeSlider', () => {
  it('passes a `formatValue` to the slider that formats prices to the country currency', () => {
    const wrapper = mountFilter()
    const slider = wrapper.get('[data-testid="range-slider"]')
    // Slot rendering and the prop both go through the same `formatTooltip`.
    expect(slider.attributes('data-tooltip')).toContain('10')
    expect(slider.attributes('data-tooltip')).toMatch(/£|GBP/)
  })

  it('falls back to a percentage formatter for max_savings_percentage', () => {
    const wrapper = mountFilter({
      filterSlug: 'max_savings_percentage',
      modelValue: [10, 80],
    })
    const slider = wrapper.get('[data-testid="range-slider"]')
    expect(slider.attributes('data-tooltip')).toContain('%')
  })

  it('announces the value when an input clamps to max', () => {
    const wrapper = mountFilter()
    const inputs = wrapper.findAllComponents({ name: 'SFRangeInput' })
    inputs[1]!.vm.$emit('clamp', { requested: 9999, applied: 5000 })

    expect(announce).toHaveBeenCalledWith(
      'filter_range_slider.a11y.value_clamped_to_max',
    )
  })

  it('announces the value when an input clamps to min', () => {
    const wrapper = mountFilter()
    const inputs = wrapper.findAllComponents({ name: 'SFRangeInput' })
    inputs[0]!.vm.$emit('clamp', { requested: 100, applied: 1000 })

    expect(announce).toHaveBeenCalledWith(
      'filter_range_slider.a11y.value_clamped_to_min',
    )
  })

  it('announces again when the same bound is clamped repeatedly', () => {
    const wrapper = mountFilter()
    const inputs = wrapper.findAllComponents({ name: 'SFRangeInput' })

    inputs[1]!.vm.$emit('clamp', { requested: 9999, applied: 5000 })
    inputs[1]!.vm.$emit('clamp', { requested: 8888, applied: 5000 })

    // Re-announcing an identical message is the announcer's responsibility; the
    // component just delegates each clamp.
    expect(announce).toHaveBeenCalledTimes(2)
    expect(announce).toHaveBeenLastCalledWith(
      'filter_range_slider.a11y.value_clamped_to_max',
    )
  })

  it('does not announce until a clamp is emitted', () => {
    mountFilter()
    expect(announce).not.toHaveBeenCalled()
  })
})
