import { defineComponent } from 'vue'
import type { DirectiveBinding, RendererNode, VNode } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, vi, it } from 'vitest'
import type { Mock } from 'vitest'

import { vDialog } from './dialog'

function createTransitionHooks() {
  return {
    beforeEnter: vi.fn<(el: Element) => void>(),
    enter: vi.fn<(el: Element) => void>(),
    leave: vi.fn<(el: Element, done: () => void) => void>(),
  }
}

type TransitionHooks = ReturnType<typeof createTransitionHooks>

function binding(
  value: unknown,
  oldValue: unknown = undefined,
  modifiers: Partial<Record<string, boolean>> = {},
) {
  return { value, oldValue, modifiers } as DirectiveBinding<unknown>
}

function directiveVNode(transition?: TransitionHooks) {
  return { transition } as unknown as VNode<RendererNode, HTMLDialogElement>
}

describe('v-dialog directive', () => {
  let show: Mock<() => void>
  let showModal: Mock<() => void>
  let close: Mock<() => void>

  // `restoreMocks` puts happy-dom's own methods back before every test.
  beforeEach(() => {
    show = vi
      .spyOn(HTMLDialogElement.prototype, 'show')
      .mockImplementation(() => {})
    showModal = vi
      .spyOn(HTMLDialogElement.prototype, 'showModal')
      .mockImplementation(() => {})
    close = vi
      .spyOn(HTMLDialogElement.prototype, 'close')
      .mockImplementation(() => {})
  })

  it('should open the dialog when the value is truthy', async () => {
    const component = defineComponent({
      directives: {
        dialog: vDialog,
      },
      data() {
        return { value: true }
      },
      template: '<dialog v-dialog="value"></dialog>',
    })

    mount(component)
    expect(show).toHaveBeenCalled()
  })

  it('should close the dialog when the value is falsy', async () => {
    const component = defineComponent({
      directives: {
        dialog: vDialog,
      },
      data() {
        return { value: false }
      },
      template: '<dialog v-dialog="value"></dialog>',
    })

    mount(component)
    expect(close).toHaveBeenCalled()
  })

  it('should open the dialog with showModal when when the modifier is set', async () => {
    const component = defineComponent({
      directives: {
        dialog: vDialog,
      },
      data() {
        return { value: true }
      },
      template: '<dialog v-dialog.modal="value"></dialog>',
    })

    mount(component)
    expect(showModal).toHaveBeenCalled()
  })

  it('should open and close when the value changes', async () => {
    const component = defineComponent({
      directives: {
        dialog: vDialog,
      },
      data() {
        return { value: false }
      },
      template: '<dialog v-dialog.modal="value"></dialog>',
    })

    const wrapper = mount(component)

    close.mockClear()

    await wrapper.setData({ value: true })
    expect(showModal).toHaveBeenCalled()

    await wrapper.setData({ value: false })
    expect(close).toHaveBeenCalled()
  })

  it('focuses the dialog itself when opened as a modal', async () => {
    const component = defineComponent({
      directives: { dialog: vDialog },
      data() {
        return { value: false }
      },
      template:
        '<dialog v-dialog.modal="value" tabindex="-1"><button>Close</button></dialog>',
    })

    const wrapper = mount(component, { attachTo: document.body })
    await wrapper.setData({ value: true })

    const dialog = wrapper.find('dialog').element
    expect(document.activeElement).toBe(dialog)

    wrapper.unmount()
  })

  it('leaves focus to a descendant that opts in with autofocus', async () => {
    const component = defineComponent({
      directives: { dialog: vDialog },
      data() {
        return { value: false }
      },
      template:
        '<dialog v-dialog.modal="value" tabindex="-1"><input autofocus /></dialog>',
    })

    const wrapper = mount(component, { attachTo: document.body })
    await wrapper.setData({ value: true })

    const dialog = wrapper.find('dialog').element
    expect(document.activeElement).not.toBe(dialog)

    wrapper.unmount()
  })

  describe('inside a transition', () => {
    let el: HTMLDialogElement
    let transition: TransitionHooks

    beforeEach(() => {
      // Own mocks on the element: the components project shares one happy-dom
      // per worker across test files, so a dialog another file left mounted
      // would add calls to the prototype spies these tests count.
      show = vi.fn()
      showModal = vi.fn()
      close = vi.fn()
      el = Object.assign(document.createElement('dialog'), {
        show,
        showModal,
        close,
      })
      transition = createTransitionHooks()
    })

    /** Runs the `updated` hook, which Vue calls with the current and previous VNode. */
    const update = (
      value: unknown,
      oldValue: unknown,
      modifiers: Partial<Record<string, boolean>> = {},
    ) =>
      vDialog.updated?.(
        el,
        binding(value, oldValue, modifiers),
        directiveVNode(transition),
        directiveVNode(),
      )

    it('primes the enter transition when the dialog starts open', () => {
      vDialog.beforeMount?.(el, binding(true), directiveVNode(transition), null)
      expect(transition.beforeEnter).toHaveBeenCalledWith(el)

      vDialog.mounted?.(el, binding(true), directiveVNode(transition), null)
      expect(transition.enter).toHaveBeenCalledWith(el)
      expect(show).toHaveBeenCalledOnce()
    })

    it('ignores an update that leaves the value truthy', () => {
      // A re-render can hand the directive a new value that toggles nothing.
      update(1, true)

      expect(transition.beforeEnter).not.toHaveBeenCalled()
      expect(show).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
    })

    it('opens the modal between the enter hooks', () => {
      update(true, false, { modal: true })

      expect(transition.beforeEnter).toHaveBeenCalledWith(el)
      expect(showModal).toHaveBeenCalledOnce()
      expect(transition.enter).toHaveBeenCalledWith(el)
      expect(showModal.mock.invocationCallOrder[0]).toBeGreaterThan(
        transition.beforeEnter.mock.invocationCallOrder[0]!,
      )
      expect(showModal.mock.invocationCallOrder[0]).toBeLessThan(
        transition.enter.mock.invocationCallOrder[0]!,
      )
    })

    it('keeps the dialog open until the leave transition finishes', () => {
      update(false, true, { modal: true })

      expect(transition.leave).toHaveBeenCalledOnce()
      expect(close).not.toHaveBeenCalled()

      transition.leave.mock.calls[0]?.[1]()

      expect(close).toHaveBeenCalledOnce()
    })

    it('closes the dialog before the element unmounts', () => {
      vDialog.beforeUnmount?.(
        el,
        binding(true),
        directiveVNode(transition),
        null,
      )

      expect(close).toHaveBeenCalledOnce()
    })
  })
})
