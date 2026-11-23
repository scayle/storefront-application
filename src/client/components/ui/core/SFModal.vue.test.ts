import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import SFModal from './SFModal.vue'

const t = (key: string) => key

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t }),
}))

const globalMocks = { $t: t }

const SFFadeInTransitionStub = defineComponent({
  name: 'SFFadeInTransition',
  template: '<div><slot /></div>',
})

const SFButtonStub = defineComponent({
  name: 'SFButton',
  props: ['variant'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
})

// SFModal wraps the dialog in ClientOnly, which renders only after mount.
const globalMountConfig = {
  mocks: globalMocks,
  stubs: {
    SFFadeInTransition: SFFadeInTransitionStub,
    SFButton: SFButtonStub,
    ClientOnly: { template: '<div><slot /></div>' },
  },
}

describe('SFModal', () => {
  it('keeps the dialog in the DOM and closes it when visible is false', () => {
    const close = vi.spyOn(HTMLDialogElement.prototype, 'close')

    const wrapper = mount(SFModal, {
      props: {
        visible: false,
        headline: 'Hidden',
      },
      global: globalMountConfig,
    })

    expect(wrapper.find('dialog').exists()).toBe(true)
    expect(close).toHaveBeenCalled()
  })

  it('renders structured headline, description, actions slot, and fixed cancel', () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Remove item',
        description: 'Are you sure?',
      },
      slots: {
        actions: '<button data-testid="modal-primary-action">Remove</button>',
      },
      global: globalMountConfig,
    })

    expect(wrapper.text()).toContain('Remove item')
    expect(wrapper.text()).toContain('Are you sure?')
    expect(wrapper.find('[data-testid="modal-primary-action"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="modal-cancel-action"]').exists()).toBe(
      true,
    )
    expect(wrapper.text()).toContain('global.cancel')
  })

  it('hides description markup when description is omitted', () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Confirm',
      },
      slots: {
        actions: '<button>OK</button>',
      },
      global: globalMountConfig,
    })

    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.get('dialog').attributes('aria-describedby')).toBeUndefined()
  })

  it('renders every action before the fixed cancel button', () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Choose',
      },
      slots: {
        actions: '<button>Action 1</button><button>Action 2</button>',
      },
      global: globalMountConfig,
    })

    const actionRow = wrapper.get('[data-testid="modal-cancel-action"]').element
      .parentElement!

    expect(
      Array.from(actionRow.children, (action) => action.textContent),
    ).toEqual(['Action 1', 'Action 2', 'global.cancel'])
  })

  it('closes when the fixed cancel button is clicked', async () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Confirm',
      },
      slots: {
        actions: '<button>Confirm</button>',
      },
      global: globalMountConfig,
    })

    await wrapper.find('[data-testid="modal-cancel-action"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false])
  })

  it('uses a custom cancelLabel on the fixed cancel button', () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Confirm',
        cancelLabel: 'Dismiss',
      },
      slots: {
        actions: '<button>OK</button>',
      },
      global: globalMountConfig,
    })

    expect(wrapper.text()).toContain('Dismiss')
  })

  it('omits the action row when the actions slot is empty', () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Title only',
      },
      global: globalMountConfig,
    })

    expect(wrapper.find('[data-testid="modal-primary-action"]').exists()).toBe(
      false,
    )
    expect(wrapper.find('[data-testid="modal-cancel-action"]').exists()).toBe(
      false,
    )
  })

  it('renders a standalone cancel button when cancelLabel is set without actions', () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Notice',
        cancelLabel: 'Got it',
      },
      global: globalMountConfig,
    })

    expect(wrapper.find('[data-testid="modal-cancel-action"]').exists()).toBe(
      true,
    )
    expect(wrapper.text()).toContain('Got it')
    expect(wrapper.find('[data-testid="modal-primary-action"]').exists()).toBe(
      false,
    )
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        label: 'Dialog',
      },
      slots: {
        default: '<p>Custom body</p>',
      },
      global: globalMountConfig,
    })

    await wrapper.find('[data-testid="close-button"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false])
  })

  it('sets aria-labelledby from headline in structured mode', () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Title',
      },
      slots: {
        actions: '<button>OK</button>',
      },
      global: globalMountConfig,
    })

    const dialog = wrapper.find('dialog')
    const labelledBy = dialog.attributes('aria-labelledby')
    const titleId = wrapper.find('h2').attributes('id')
    expect(labelledBy).toBe(titleId)
    expect(dialog.attributes('aria-modal')).toBe('true')
  })

  // Shops style a fullscreen modal through the class they pass in, so it has to
  // land on the panel around the content, not on the `<dialog>`.
  it.for([
    { layout: 'structured', props: { headline: 'Confirm' } },
    { layout: 'custom-slot', props: { label: 'Dialog' } },
    { layout: 'fullscreen', props: { label: 'Fullscreen', backdrop: false } },
  ])(
    'puts a fallthrough class on the panel in the $layout layout',
    ({ props }) => {
      const wrapper = mount(SFModal, {
        props: { visible: true, ...props },
        attrs: { class: 'shop-panel' },
        slots: { default: '<p>Body</p>' },
        global: globalMountConfig,
      })

      const panel = wrapper.get('.shop-panel')
      expect(panel.element.tagName).not.toBe('DIALOG')
      expect(panel.find('[data-testid="modal-content"]').exists()).toBe(true)
    },
  )

  it('makes the dialog the focus delegate so no interior control is auto-focused', () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Confirm',
      },
      slots: {
        actions: '<button>OK</button>',
      },
      global: globalMountConfig,
    })

    const dialog = wrapper.find('dialog')
    expect(dialog.attributes('autofocus')).toBe('')
    expect(dialog.attributes('tabindex')).toBe('-1')

    const panel = wrapper.find('dialog > div > div').element
    expect(panel.hasAttribute('tabindex')).toBe(false)
    expect(panel.hasAttribute('autofocus')).toBe(false)
  })

  // The panel stops at the viewport and the content scrolls inside it.
  it('makes the modal content scrollable when it exceeds the viewport', () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        headline: 'Long content',
      },
      slots: {
        default: '<p>Body</p>',
        actions: '<button>OK</button>',
      },
      global: globalMountConfig,
    })

    const content = wrapper.get('[data-testid="modal-content"]')
    expect(content.element.parentElement?.classList).toContain('max-h-full')
    expect(content.element.parentElement?.classList).toContain(
      'overflow-hidden',
    )
    expect(content.classes()).toEqual(
      expect.arrayContaining(['overflow-y-auto', 'overscroll-y-contain']),
    )
  })

  it('does not close on backdrop click when closeOnBackdropClick is false', async () => {
    const wrapper = mount(SFModal, {
      props: {
        visible: true,
        label: 'Dialog',
        closeOnBackdropClick: false,
      },
      slots: {
        default: '<p>Body</p>',
      },
      global: globalMountConfig,
    })

    const dialog = wrapper.find('dialog')
    await dialog.trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
