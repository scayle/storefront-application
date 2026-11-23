import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ChipSubType, ChipVariant } from '@client/utils/constants'
import SFChip from './SFChip.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

describe('SFChip', () => {
  describe('multi-select', () => {
    it('adds the item to the model array when its checkbox is checked', async () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.MULTI_SELECT,
          item: 'sm',
          modelValue: [],
        },
        slots: { default: 'SM' },
      })
      const input = wrapper.get('[data-testid="chip-input"]')

      expect((input.element as HTMLInputElement).type).toBe('checkbox')

      await input.setValue(true)
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['sm']])
    })

    it('removes the item from the model array when unchecked', async () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.MULTI_SELECT,
          item: 'sm',
          modelValue: ['xs', 'sm'],
        },
        slots: { default: 'SM' },
      })

      await wrapper.get('[data-testid="chip-input"]').setValue(false)

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['xs']])
    })
  })

  describe('single-select', () => {
    it('renders the input as a radio and assigns the item to the model', async () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.SINGLE_SELECT,
          item: 'a',
          modelValue: undefined,
        },
        slots: { default: 'A' },
      })
      const input = wrapper.get('[data-testid="chip-input"]')

      expect((input.element as HTMLInputElement).type).toBe('radio')

      await input.setValue(true)
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['a'])
    })
  })

  describe('choice', () => {
    it('renders the input as a radio', () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.CHOICE,
          item: 'a',
          modelValue: undefined,
        },
        slots: { default: 'A' },
      })
      const input = wrapper.get('[data-testid="chip-input"]')
      expect((input.element as HTMLInputElement).type).toBe('radio')
    })
  })

  describe('disabled', () => {
    it('sets the disabled attribute on the underlying input', () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.MULTI_SELECT,
          item: 'sm',
          disabled: true,
          modelValue: [],
        },
        slots: { default: 'SM' },
      })
      const input = wrapper.get('[data-testid="chip-input"]')
      expect((input.element as HTMLInputElement).disabled).toBe(true)
    })
  })

  describe('dismissable', () => {
    it('emits dismiss with the item value when the close button is clicked', async () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.DISMISSABLE,
          subType: ChipSubType.VOUCHER,
          item: 'SUMMER20',
        },
        slots: { default: 'Summer Deal' },
      })
      await wrapper.get('[data-testid="chip-dismiss"]').trigger('click')
      expect(wrapper.emitted('dismiss')?.[0]).toEqual(['SUMMER20'])
    })

    it('extends the pointer target of the close button to 24px', () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.DISMISSABLE,
          subType: ChipSubType.VOUCHER,
          item: 'SUMMER20',
        },
        slots: { default: 'Summer Deal' },
      })

      expect(wrapper.get('[data-testid="chip-dismiss"]').classes()).toContain(
        'hit-area-min',
      )
    })

    it('labels the close button with the translated remove label for the slot text', () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.DISMISSABLE,
          subType: ChipSubType.VOUCHER,
          item: 'SUMMER20',
        },
        slots: { default: 'Summer Deal' },
      })
      const button = wrapper.get('[data-testid="chip-dismiss"]')
      expect(button.attributes('aria-label')).toBe(
        'chip.remove_item({"name":"Summer Deal"})',
      )
    })

    it('falls back to the translated plain remove label without slot text', () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.DISMISSABLE,
          subType: ChipSubType.VOUCHER,
          item: 'SUMMER20',
        },
      })

      expect(
        wrapper.get('[data-testid="chip-dismiss"]').attributes('aria-label'),
      ).toBe('chip.remove')
    })

    it('uses an explicit dismissAriaLabel when provided', () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.DISMISSABLE,
          subType: ChipSubType.PROMOTION,
          item: 'p1',
          dismissAriaLabel: 'Remove promotion: Celebrate 40y',
        },
        slots: { default: 'Celebrate 40y' },
      })
      const button = wrapper.get('[data-testid="chip-dismiss"]')
      expect(button.attributes('aria-label')).toBe(
        'Remove promotion: Celebrate 40y',
      )
    })

    it('disables the close button when the chip is disabled', () => {
      const wrapper = mount(SFChip, {
        props: {
          variant: ChipVariant.DISMISSABLE,
          subType: ChipSubType.VOUCHER,
          item: 'SUMMER20',
          disabled: true,
        },
        slots: { default: 'Summer Deal' },
      })
      const button = wrapper.get('[data-testid="chip-dismiss"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
      expect(
        wrapper
          .get('[data-testid="chip-dismissable"]')
          .attributes('aria-disabled'),
      ).toBe('true')
    })
  })
})
