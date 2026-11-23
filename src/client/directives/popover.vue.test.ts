import { defineComponent } from 'vue'
import type { DirectiveBinding, RendererNode, VNode } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, vi, it } from 'vitest'
import type { Mock } from 'vitest'
import { vPopover } from './popover'

/** The transition hooks Vue puts on the VNode when a `<Transition>` wraps the element. */
function createTransitionHooks() {
  return {
    beforeEnter: vi.fn<(el: Element) => void>(),
    enter: vi.fn<(el: Element) => void>(),
    leave: vi.fn<(el: Element, done: () => void) => void>(),
  }
}

type TransitionHooks = ReturnType<typeof createTransitionHooks>

function binding(value: unknown, oldValue: unknown = undefined) {
  return { value, oldValue } as DirectiveBinding<unknown>
}

function directiveVNode(transition?: TransitionHooks) {
  return { transition } as unknown as VNode<RendererNode, HTMLElement>
}

describe('v-popover directive', () => {
  // happy-dom has no Popover API, and unmounting the wrapper hides the popover.
  // The tests spy on these no-op methods, and `restoreMocks` resets the spies.
  beforeEach(() => {
    HTMLElement.prototype.showPopover = () => {}
    HTMLElement.prototype.hidePopover = () => {}
  })

  it('should add popover attribute', () => {
    const component = defineComponent({
      directives: {
        popover: vPopover,
      },
      data() {
        return { value: true }
      },
      template: '<div v-popover="value"></div>',
    })

    const wrapper = mount(component)
    expect(wrapper.attributes('popover')).toBe('manual')
  })

  it('should show the popover when the value is truthy', () => {
    const component = defineComponent({
      directives: {
        popover: vPopover,
      },
      data() {
        return { value: true }
      },
      template: '<div v-popover="value"></div>',
    })

    const mockShow = vi.spyOn(HTMLElement.prototype, 'showPopover')

    mount(component)
    expect(mockShow).toHaveBeenCalled()
  })

  it('should hide the popover when the value is falsy', () => {
    const component = defineComponent({
      directives: {
        popover: vPopover,
      },
      data() {
        return { value: false }
      },
      template: '<div v-popover="value"></div>',
    })

    const mockHide = vi.spyOn(HTMLElement.prototype, 'hidePopover')

    mount(component)
    expect(mockHide).toHaveBeenCalled()
  })

  it('should open and close when the value changes', async () => {
    const component = defineComponent({
      directives: {
        popover: vPopover,
      },
      data() {
        return { value: false }
      },
      template: '<div v-popover="value"></div>',
    })

    const mockShow = vi.spyOn(HTMLElement.prototype, 'showPopover')
    const mockHide = vi.spyOn(HTMLElement.prototype, 'hidePopover')

    const wrapper = await mount(component)

    mockHide.mockReset()
    mockShow.mockReset()

    await wrapper.setData({ value: true })
    expect(mockShow).toHaveBeenCalled()

    await wrapper.setData({ value: false })
    expect(mockHide).toHaveBeenCalled()
  })

  it('should set the popover attribute during SSR, where directives are skipped', () => {
    expect(vPopover.getSSRProps?.(binding(true), directiveVNode())).toEqual({
      popover: 'manual',
    })
  })

  describe('inside a transition', () => {
    let el: HTMLElement
    let showPopover: Mock<(options?: ShowPopoverOptions) => void>
    let hidePopover: Mock<() => void>
    let transition: TransitionHooks

    beforeEach(() => {
      showPopover = vi.fn<(options?: ShowPopoverOptions) => void>()
      hidePopover = vi.fn<() => void>()
      // Own properties, so the prototype stubs of the mount tests above do not
      // record calls made here.
      el = document.createElement('div')
      el.showPopover = showPopover
      el.hidePopover = hidePopover
      transition = createTransitionHooks()
    })

    /** Runs the `updated` hook, which Vue calls with the current and previous VNode. */
    const update = (
      value: unknown,
      oldValue: unknown,
      hooks?: TransitionHooks,
    ) =>
      vPopover.updated?.(
        el,
        binding(value, oldValue),
        directiveVNode(hooks),
        directiveVNode(),
      )

    it('should prime the enter transition when the popover starts open', () => {
      vPopover.beforeMount?.(
        el,
        binding(true),
        directiveVNode(transition),
        null,
      )
      expect(transition.beforeEnter).toHaveBeenCalledWith(el)

      vPopover.mounted?.(el, binding(true), directiveVNode(transition), null)
      expect(transition.enter).toHaveBeenCalledWith(el)
      expect(showPopover).toHaveBeenCalledOnce()
    })

    it('should not prime the enter transition when the popover starts closed', () => {
      vPopover.beforeMount?.(
        el,
        binding(false),
        directiveVNode(transition),
        null,
      )
      vPopover.mounted?.(el, binding(false), directiveVNode(transition), null)

      expect(transition.beforeEnter).not.toHaveBeenCalled()
      expect(transition.enter).not.toHaveBeenCalled()
      expect(hidePopover).toHaveBeenCalledOnce()
    })

    it('should ignore an update that leaves the value truthy', () => {
      // A re-render can hand the directive a new value that toggles nothing.
      update(1, true, transition)

      expect(transition.beforeEnter).not.toHaveBeenCalled()
      expect(showPopover).not.toHaveBeenCalled()
      expect(hidePopover).not.toHaveBeenCalled()
    })

    it('should show the popover between the enter hooks when it opens', () => {
      update(true, false, transition)

      // Painting the element before `enter` is what gives the transition a
      // starting frame to animate from.
      expect(transition.beforeEnter).toHaveBeenCalledWith(el)
      expect(showPopover).toHaveBeenCalledOnce()
      expect(transition.enter).toHaveBeenCalledWith(el)
      expect(showPopover.mock.invocationCallOrder[0]).toBeGreaterThan(
        transition.beforeEnter.mock.invocationCallOrder[0]!,
      )
      expect(showPopover.mock.invocationCallOrder[0]).toBeLessThan(
        transition.enter.mock.invocationCallOrder[0]!,
      )
    })

    it('should keep the popover shown until the leave transition finishes', () => {
      update(false, true, transition)

      expect(transition.leave).toHaveBeenCalledOnce()
      expect(hidePopover).not.toHaveBeenCalled()

      transition.leave.mock.calls[0]?.[1]()

      expect(hidePopover).toHaveBeenCalledOnce()
    })

    it('should toggle the popover directly without a transition', () => {
      update(true, false)
      expect(showPopover).toHaveBeenCalledOnce()

      update(false, true)
      expect(hidePopover).toHaveBeenCalledOnce()
    })

    it('should show the popover with the source it is bound with', () => {
      const source = document.createElement('button')

      update({ open: true, source }, { open: false, source })

      expect(showPopover).toHaveBeenCalledExactlyOnceWith({ source })
    })

    it('should hide the popover when its object binding closes', () => {
      const source = document.createElement('button')

      update({ open: false, source }, { open: true, source })

      expect(hidePopover).toHaveBeenCalledOnce()
    })

    it('should hide the popover before the element unmounts', () => {
      vPopover.beforeUnmount?.(
        el,
        binding(true),
        directiveVNode(transition),
        null,
      )

      expect(hidePopover).toHaveBeenCalledOnce()
    })
  })
})
