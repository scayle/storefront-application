import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SFRangeSlider from './SFRangeSlider.vue'

const tMock = (key: string) => key

function mountSlider(
  overrides: Partial<InstanceType<typeof SFRangeSlider>['$props']> = {},
) {
  return mount(SFRangeSlider, {
    props: {
      modelValue: [20, 80],
      min: 0,
      max: 100,
      step: 1,
      ...overrides,
    },
    global: {
      mocks: { $t: tMock },
    },
  })
}

const thumbs = (wrapper: ReturnType<typeof mountSlider>) =>
  wrapper.findAll('[role="slider"]')

describe('SFRangeSlider', () => {
  describe('group naming', () => {
    it('does not set role="group" without an aria label', () => {
      const wrapper = mountSlider()
      expect(wrapper.element.getAttribute('role')).toBeNull()
    })

    it('sets role="group" with aria-label when provided', () => {
      const wrapper = mountSlider({ ariaLabel: 'Price range' })
      expect(wrapper.element.getAttribute('role')).toBe('group')
      expect(wrapper.element.getAttribute('aria-label')).toBe('Price range')
    })

    it('sets role="group" with aria-labelledby when provided', () => {
      const wrapper = mountSlider({ ariaLabelledby: 'heading-1' })
      expect(wrapper.element.getAttribute('role')).toBe('group')
      expect(wrapper.element.getAttribute('aria-labelledby')).toBe('heading-1')
    })
  })

  describe('thumb ARIA', () => {
    it('falls back to translated thumb labels when no min/max label is given', () => {
      const wrapper = mountSlider()
      const [min, max] = thumbs(wrapper)
      expect(min!.attributes('aria-label')).toBe(
        'range_slider.a11y.thumb_minimum',
      )
      expect(max!.attributes('aria-label')).toBe(
        'range_slider.a11y.thumb_maximum',
      )
    })

    it('drives aria-valuetext from formatValue', () => {
      const wrapper = mountSlider({
        formatValue: (value) => `€ ${value.toFixed(2)}`,
      })
      const [min, max] = thumbs(wrapper)
      expect(min!.attributes('aria-valuetext')).toBe('€ 20.00')
      expect(max!.attributes('aria-valuetext')).toBe('€ 80.00')
    })

    it('omits aria-valuetext when no formatValue is provided', () => {
      const wrapper = mountSlider()
      const [min] = thumbs(wrapper)
      expect(min!.attributes('aria-valuetext')).toBeUndefined()
    })

    it('renders aria-disabled instead of native disabled on the thumbs', () => {
      const wrapper = mountSlider({ disabled: true })
      const [min, max] = thumbs(wrapper)
      expect(min!.attributes('aria-disabled')).toBe('true')
      expect(max!.attributes('aria-disabled')).toBe('true')
      expect(min!.attributes('disabled')).toBeUndefined()
      expect(max!.attributes('disabled')).toBeUndefined()
    })
  })

  describe('keyboard', () => {
    it.for<{
      key: string
      thumb: 'min' | 'max'
      expected: [number, number]
      modelValue?: [number, number]
      largeStep?: number
    }>([
      { key: 'ArrowLeft', thumb: 'min', expected: [19, 80] },
      { key: 'ArrowUp', thumb: 'min', expected: [21, 80] },
      { key: 'ArrowRight', thumb: 'max', expected: [20, 81] },
      { key: 'ArrowDown', thumb: 'max', expected: [20, 79] },
      { key: 'PageUp', thumb: 'max', largeStep: 5, expected: [20, 85] },
      // Without `largeStep`, a page is a tenth of the range.
      { key: 'PageDown', thumb: 'min', expected: [10, 80] },
      { key: 'Home', thumb: 'min', expected: [0, 80] },
      { key: 'End', thumb: 'max', expected: [20, 100] },
      // The minimum thumb stops at the maximum thumb.
      {
        key: 'ArrowRight',
        thumb: 'min',
        modelValue: [50, 50],
        expected: [50, 50],
      },
    ])(
      'emits $expected for $key on the $thumb thumb',
      async ({ key, thumb, largeStep, modelValue = [20, 80], expected }) => {
        const wrapper = mountSlider({ largeStep, modelValue })
        await thumbs(wrapper)[thumb === 'min' ? 0 : 1]!.trigger('keydown', {
          key,
        })
        expect(wrapper.emitted('update:modelValue')).toEqual([[expected]])
      },
    )

    it('does not preventDefault or emit for unmapped keys (Tab falls through)', async () => {
      const wrapper = mountSlider()
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        cancelable: true,
      })
      thumbs(wrapper)[0]!.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('does not emit when disabled', async () => {
      const wrapper = mountSlider({ disabled: true })
      await thumbs(wrapper)[0]!.trigger('keydown', { key: 'ArrowLeft' })
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  describe('pointer', () => {
    // Binds `v-model` like a parent does, and gives the track a 200px box at
    // the viewport's left edge, since happy-dom does no layout.
    const mountOnTrack = () => {
      const wrapper = mount(SFRangeSlider, {
        props: {
          modelValue: [20, 80],
          'onUpdate:modelValue': (value: [number, number]): void => {
            void wrapper.setProps({ modelValue: value })
          },
        },
        global: { mocks: { $t: tMock } },
        attachTo: document.body,
      })
      vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 200, 4),
      )
      return wrapper
    }

    it.for([
      { clientX: 30, thumb: 0, expected: [15, 80] },
      { clientX: 150, thumb: 1, expected: [20, 75] },
    ] as const)(
      'moves the nearest thumb to a track click at $clientX px, focuses it and emits $expected',
      async ({ clientX, thumb, expected }) => {
        const wrapper = mountOnTrack()

        await wrapper.trigger('click', { clientX })
        await flushPromises()

        expect(wrapper.emitted('update:modelValue')).toEqual([[expected]])
        expect(wrapper.emitted('click')).toEqual([[expected]])
        expect(document.activeElement).toBe(thumbs(wrapper)[thumb]!.element)
      },
    )

    it('moves a grabbed thumb with the pointer and emits dragend with the range on release', async () => {
      const wrapper = mountOnTrack()
      const maxThumb = thumbs(wrapper)[1]!

      await maxThumb.trigger('pointerdown', { pointerId: 1, clientX: 160 })
      await maxThumb.trigger('pointermove', { pointerId: 1, clientX: 120 })
      await maxThumb.trigger('pointerup', { pointerId: 1 })

      expect(wrapper.emitted('update:modelValue')).toEqual([[[20, 60]]])
      expect(wrapper.emitted('dragend')).toEqual([[[20, 60]]])
    })

    it('stops following the pointer once the thumb is released', async () => {
      const wrapper = mountOnTrack()
      const maxThumb = thumbs(wrapper)[1]!

      await maxThumb.trigger('pointerdown', { pointerId: 1, clientX: 160 })
      await maxThumb.trigger('pointerup', { pointerId: 1 })
      await maxThumb.trigger('pointermove', { pointerId: 1, clientX: 120 })

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })
})
