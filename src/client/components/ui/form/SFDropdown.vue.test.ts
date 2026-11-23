import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { DropdownVariant } from '@client/utils/constants'
import SFDropdown from './SFDropdown.vue'

vi.mock('@client/directives/popover', () => ({
  vPopover: {
    mounted(el: HTMLElement) {
      el.setAttribute('popover', 'manual')
    },
    getSSRProps() {
      return { popover: 'manual' }
    },
  },
}))

vi.mock('@client/composables/useDefaultBreakpoints', () => ({
  useDefaultBreakpoints: () => ({
    smaller: () => ({ value: false }),
  }),
}))

vi.mock('@assets/icons/navigation/down.svg', () => ({
  default: {
    name: 'IconChevronDown',
    template: '<svg />',
  },
}))

vi.mock('@assets/icons/notify/alert.svg', () => ({
  default: {
    name: 'IconAlert',
    template: '<svg />',
  },
}))

const TransitionStub = defineComponent({
  name: 'Transition',
  template: '<div><slot /></div>',
})

const mountDropdown = (
  visible = false,
  extraProps: Record<string, unknown> = {},
) =>
  mount(SFDropdown, {
    props: {
      id: 'test-dropdown',
      items: ['Option A', 'Option B'],
      modelValue: 'Option A',
      visible,
      ...extraProps,
    },
    attachTo: document.body,
    global: {
      stubs: {
        Transition: TransitionStub,
        SFDropdownOptionItem: defineComponent({
          props: ['id'],
          template: '<li :id="id"><slot /></li>',
        }),
        SFDropdownOptionGroup: defineComponent({
          template: '<ul><slot /></ul>',
        }),
      },
    },
  })

describe('SFDropdown', () => {
  it('hides the options panel with display:none when closed', () => {
    const wrapper = mountDropdown(false)

    const panel = wrapper.find('[popover="manual"]')
    expect(panel.exists()).toBe(true)
    expect((panel.element as HTMLElement).style.display).toBe('none')
    wrapper.unmount()
  })

  // The panel starts at the trigger's width and grows to fit its rows, rather
  // than being held to a fixed floor. A floor sized for one component's rows
  // over-widened every other dropdown, and a panel pinned to a narrow trigger
  // clipped them.
  it('sizes the open panel to its content, no narrower than the trigger', async () => {
    const wrapper = mountDropdown(true)
    // The panel is positioned a tick after mount, so its inline style is not
    // on the element yet when `mount` returns.
    await flushPromises()

    const panel = wrapper.find('[popover="manual"]').element as HTMLElement
    expect(panel.style.width).toBe('max-content')
    expect(panel.style.minWidth).not.toBe('')
    expect(panel.style.maxWidth).not.toBe('')
    wrapper.unmount()
  })

  it('shows the listbox panel when visible is true', () => {
    const wrapper = mountDropdown(true)

    expect(wrapper.get('#test-dropdown-listbox').isVisible()).toBe(true)
    wrapper.unmount()
  })

  it('keeps the listbox out of the tab order', () => {
    // Chrome and Firefox make a scroll container keyboard-focusable, so without this a
    // Tab from the open combobox lands on the listbox while the panel closes.
    const wrapper = mountDropdown(true)

    expect(wrapper.get('[role="listbox"]').attributes('tabindex')).toBe('-1')
    wrapper.unmount()
  })

  it('keeps the combobox trigger rendered when the panel is closed', () => {
    const wrapper = mountDropdown(false)

    const trigger = wrapper.find('[role="combobox"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('sets the focus state on the closed combobox while it has focus', async () => {
    const wrapper = mountDropdown(false)
    const trigger = wrapper.get('[role="combobox"]')

    await trigger.trigger('focusin')
    expect(trigger.attributes('data-state')).toBe('focus')

    await trigger.trigger('focusout')
    expect(trigger.attributes('data-state')).toBe('filled')
    wrapper.unmount()
  })

  it('names the combobox and listbox from the ariaLabel prop', () => {
    // A combobox takes no name from its inner text, so consumers rely on this
    // prop reaching the trigger. Without it the control is unnamed for AT.
    const wrapper = mountDropdown(true, { ariaLabel: 'Select size' })

    expect(wrapper.find('[role="combobox"]').attributes('aria-label')).toBe(
      'Select size',
    )
    expect(wrapper.find('[role="listbox"]').attributes('aria-label')).toBe(
      'Select size',
    )
    wrapper.unmount()
  })

  it('names the combobox and listbox after the visible label', () => {
    const wrapper = mountDropdown(true, {
      variant: DropdownVariant.WITH_LABEL,
      label: 'Size',
    })
    const labelId = wrapper.get('label').attributes('id')

    expect(wrapper.get('label').text()).toBe('Size')
    expect(wrapper.get('[role="combobox"]').attributes('aria-labelledby')).toBe(
      labelId,
    )
    expect(wrapper.get('[role="listbox"]').attributes('aria-labelledby')).toBe(
      labelId,
    )
    wrapper.unmount()
  })

  it('prevents the default of a mousedown on an option, so focus stays on the combobox', () => {
    const wrapper = mountDropdown(true)
    const option = wrapper.get('[role="listbox"] li').element
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    })

    option.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    wrapper.unmount()
  })

  it('selects the clicked option and closes the panel', async () => {
    const wrapper = mountDropdown(true)

    await wrapper
      .findAll('[role="listbox"] li')
      .find((option) => option.text() === 'Option B')!
      .trigger('click')

    expect(wrapper.emitted('select')).toEqual([['Option B']])
    expect(wrapper.emitted('update:modelValue')).toEqual([['Option B']])
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    wrapper.unmount()
  })

  describe('keyboard', () => {
    const sizes = ['Small', 'Medium', 'Large', 'XL']

    // `visible` is left out so the dropdown keeps its own open state.
    const mountKeyboardDropdown = (props: Record<string, unknown> = {}) =>
      mount(SFDropdown, {
        props: {
          id: 'test-dropdown',
          items: sizes,
          isOptionDisabled: (item: unknown) => item === 'Medium',
          ...props,
        },
        attachTo: document.body,
        global: {
          stubs: {
            Transition: TransitionStub,
            SFDropdownOptionItem: defineComponent({
              props: ['id'],
              template: '<li :id="id"><slot /></li>',
            }),
          },
        },
      })

    const press = (
      wrapper: ReturnType<typeof mountKeyboardDropdown>,
      key: string,
    ) => wrapper.get('[role="combobox"]').trigger('keydown', { key })

    const activeOption = (wrapper: ReturnType<typeof mountKeyboardDropdown>) =>
      wrapper.get('[role="combobox"]').attributes('aria-activedescendant')

    it('opens on ArrowDown with the selected option active', async () => {
      const wrapper = mountKeyboardDropdown({ modelValue: 'Large' })

      await press(wrapper, 'ArrowDown')

      const trigger = wrapper.get('[role="combobox"]')
      expect(trigger.attributes('aria-expanded')).toBe('true')
      expect(activeOption(wrapper)).toBe('test-dropdown-option-2')
    })

    it('highlights no option on open when the selected one is disabled', async () => {
      const wrapper = mountKeyboardDropdown({ modelValue: 'Medium' })

      await press(wrapper, 'ArrowDown')

      expect(wrapper.get('[role="combobox"]').attributes('aria-expanded')).toBe(
        'true',
      )
      expect(activeOption(wrapper)).toBeUndefined()
    })

    it.for([
      { key: 'ArrowDown', disabled: ['Medium'], expected: 'option-0' },
      { key: 'ArrowUp', disabled: ['Medium'], expected: 'option-3' },
      // Covers skipping a disabled last option, not the new start index.
      { key: 'ArrowUp', disabled: ['Medium', 'XL'], expected: 'option-2' },
    ])(
      'moves to the first or last enabled option on $key when the selection is disabled and $disabled are disabled',
      async ({ key, disabled, expected }) => {
        const wrapper = mountKeyboardDropdown({
          modelValue: 'Medium',
          isOptionDisabled: (item: unknown) =>
            disabled.includes(item as string),
        })
        await press(wrapper, 'ArrowDown')

        await press(wrapper, key)

        expect(activeOption(wrapper)).toBe(`test-dropdown-${expected}`)
      },
    )

    it.for(['Enter', ' ', 'Tab'])(
      'selects nothing on %j when the selected option is disabled and none is highlighted',
      async (key) => {
        const wrapper = mountKeyboardDropdown({ modelValue: 'Medium' })
        await press(wrapper, 'ArrowDown')

        await press(wrapper, key)

        expect(wrapper.emitted('select')).toBeUndefined()
      },
    )

    it('closes on Tab when the selected option is disabled and none is highlighted', async () => {
      const wrapper = mountKeyboardDropdown({ modelValue: 'Medium' })
      await press(wrapper, 'ArrowDown')

      await press(wrapper, 'Tab')

      expect(wrapper.get('[role="combobox"]').attributes('aria-expanded')).toBe(
        'false',
      )
    })

    it('skips disabled options when moving with the arrow keys', async () => {
      const wrapper = mountKeyboardDropdown()
      await press(wrapper, 'ArrowDown')
      expect(activeOption(wrapper)).toBe('test-dropdown-option-0')

      await press(wrapper, 'ArrowDown')
      expect(activeOption(wrapper)).toBe('test-dropdown-option-2')

      await press(wrapper, 'ArrowUp')
      expect(activeOption(wrapper)).toBe('test-dropdown-option-0')
    })

    it('jumps to the last option on End and wraps to the first on ArrowDown', async () => {
      const wrapper = mountKeyboardDropdown()

      await press(wrapper, 'End')
      expect(activeOption(wrapper)).toBe('test-dropdown-option-3')

      await press(wrapper, 'ArrowDown')
      expect(activeOption(wrapper)).toBe('test-dropdown-option-0')
    })

    it.for(['Enter', ' '])(
      'selects the active option and closes on %j',
      async (key) => {
        const wrapper = mountKeyboardDropdown()
        await press(wrapper, 'ArrowDown')
        await press(wrapper, 'ArrowDown')

        await press(wrapper, key)

        expect(wrapper.emitted('select')).toEqual([['Large']])
        expect(wrapper.emitted('update:modelValue')).toEqual([['Large']])
        expect(
          wrapper.get('[role="combobox"]').attributes('aria-expanded'),
        ).toBe('false')
      },
    )

    it('commits the active option on Tab and lets focus move on', async () => {
      const wrapper = mountKeyboardDropdown()
      await press(wrapper, 'ArrowDown')
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        cancelable: true,
      })

      wrapper.get('[role="combobox"]').element.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(false)
      expect(wrapper.emitted('select')).toEqual([['Small']])
    })

    it('closes on Escape without selecting', async () => {
      const wrapper = mountKeyboardDropdown()
      await press(wrapper, 'ArrowDown')

      await press(wrapper, 'Escape')

      expect(wrapper.get('[role="combobox"]').attributes('aria-expanded')).toBe(
        'false',
      )
      expect(wrapper.emitted('select')).toBeUndefined()
    })

    it('stays closed on click and ArrowDown when disabled', async () => {
      const wrapper = mountKeyboardDropdown({ disabled: true })
      const trigger = wrapper.get('[role="combobox"]')

      await trigger.trigger('click')
      await press(wrapper, 'ArrowDown')

      expect(trigger.attributes('aria-expanded')).toBe('false')
    })
  })

  describe('helper and error message', () => {
    it('shows the error message in place of the helper message when hasErrors is set', () => {
      const wrapper = mountDropdown(false, {
        helperMessage: 'Pick a size',
        errorMessage: 'Size is required',
        hasErrors: true,
      })

      expect(wrapper.get('#test-dropdown-helper').text()).toBe(
        'Size is required',
      )
      expect(wrapper.text()).not.toContain('Pick a size')
    })

    it('shows the helper message while hasErrors is not set', () => {
      const wrapper = mountDropdown(false, {
        helperMessage: 'Pick a size',
        errorMessage: 'Size is required',
      })

      expect(wrapper.get('#test-dropdown-helper').text()).toBe('Pick a size')
    })

    it('describes the combobox by the external description and the message', () => {
      const wrapper = mountDropdown(false, {
        ariaDescribedby: 'size-guide',
        helperMessage: 'Pick a size',
      })

      expect(
        wrapper.get('[role="combobox"]').attributes('aria-describedby'),
      ).toBe('size-guide test-dropdown-helper')
    })
  })

  describe('selection equality', () => {
    const items = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]

    const mountSelectable = (props: Record<string, unknown>) =>
      mount(SFDropdown, {
        props: { id: 'test-dropdown', visible: true, items, ...props },
        global: {
          stubs: {
            Transition: TransitionStub,
            SFDropdownOptionItem: defineComponent({
              props: ['id', 'selected'],
              template:
                '<li :id="id" :data-selected="selected ? \'yes\' : \'no\'" @mousedown.prevent><slot /></li>',
            }),
            SFDropdownOptionGroup: defineComponent({
              template: '<ul><slot /></ul>',
            }),
          },
        },
      })

    it('marks the matching item selected via keyBy when modelValue is reference-unequal', () => {
      // A fresh object with the same key as items[1] — mimics the Inertia
      // hydration roundtrip, where props lose reference identity.
      const wrapper = mountSelectable({
        modelValue: { key: 'b', label: 'B' },
        keyBy: (o: { key: string }) => o.key,
      })

      const options = wrapper.findAll('[role="listbox"] li')
      expect(options[0]!.attributes('data-selected')).toBe('no')
      expect(options[1]!.attributes('data-selected')).toBe('yes')
    })

    it('falls back to identity without keyBy: a reference-unequal object is not selected', () => {
      const wrapper = mountSelectable({
        modelValue: { key: 'b', label: 'B' },
      })

      const options = wrapper.findAll('[role="listbox"] li')
      expect(options[1]!.attributes('data-selected')).toBe('no')
    })
  })
})
