import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import type { StorefrontNotification } from '@client/types'
import SFToastContainer from './SFToastContainer.vue'

const notifications = ref<StorefrontNotification[]>([])

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ notifications }),
}))

vi.mock('@client/components/ui/toast/SFToast.vue', () => ({
  default: {
    name: 'SFToast',
    props: ['notification'],
    template: '<div data-testid="toast-stub">{{ notification.message }}</div>',
  },
}))

const showPopoverMock = vi.fn()
const hidePopoverMock = vi.fn()

const originalShowPopover = HTMLElement.prototype.showPopover
const originalHidePopover = HTMLElement.prototype.hidePopover
const originalMatches = HTMLElement.prototype.matches

describe('SFToastContainer', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    notifications.value = []
    showPopoverMock.mockClear()
    hidePopoverMock.mockClear()
    HTMLElement.prototype.showPopover = showPopoverMock
    HTMLElement.prototype.hidePopover = hidePopoverMock
    HTMLElement.prototype.matches = vi
      .fn()
      .mockReturnValue(false) as unknown as Element['matches']
  })

  afterEach(() => {
    // Each mount registers a `watch` on the shared module-level `notifications`
    // ref. Without unmounting, prior tests' watchers stay active and fire
    // alongside the current test's, inflating the popover call counts below.
    wrapper.unmount()
    HTMLElement.prototype.showPopover = originalShowPopover
    HTMLElement.prototype.hidePopover = originalHidePopover
    HTMLElement.prototype.matches = originalMatches
  })

  it('sets popover="manual" so the container can be promoted into the top layer', () => {
    wrapper = mount(SFToastContainer)

    expect(wrapper.attributes('popover')).toBe('manual')
  })

  it('promotes itself into the top layer on mount', () => {
    wrapper = mount(SFToastContainer)

    expect(showPopoverMock).toHaveBeenCalledTimes(1)
    expect(hidePopoverMock).not.toHaveBeenCalled()
  })

  it('re-promotes itself above a dialog opened after mount when a new toast arrives', async () => {
    wrapper = mount(SFToastContainer)
    showPopoverMock.mockClear()

    // Simulate a native `<dialog>` (e.g. the filter slide-in) having opened
    // after this container was first promoted, so it is currently on top.
    HTMLElement.prototype.matches = vi
      .fn()
      .mockReturnValue(true) as unknown as Element['matches']

    notifications.value = [
      { id: '1', message: 'All filters cleared', type: 'SUCCESS' },
    ]
    await nextTick()

    expect(hidePopoverMock).toHaveBeenCalledTimes(1)
    expect(showPopoverMock).toHaveBeenCalledTimes(1)
  })

  it('does not re-promote when the notification list shrinks', async () => {
    notifications.value = [
      { id: '1', message: 'All filters cleared', type: 'SUCCESS' },
    ]
    wrapper = mount(SFToastContainer)
    showPopoverMock.mockClear()

    notifications.value = []
    await nextTick()

    expect(showPopoverMock).not.toHaveBeenCalled()
  })

  describe('offset below the anchor', () => {
    // A real anchor reports its edge relative to the viewport, so it moves up
    // by whatever the page has scrolled.
    let anchorBottomInPage = 108
    const anchor = document.createElement('div')
    anchor.getBoundingClientRect = () =>
      ({ bottom: anchorBottomInPage - window.scrollY }) as DOMRect

    // happy-dom never fires ResizeObserver callbacks, so the test fires them,
    // and only for observers watching the anchor.
    let resizeObservers: {
      callback: ResizeObserverCallback
      targets: Element[]
    }[] = []
    const disconnectMock = vi.fn()

    const resizeAnchor = () => {
      for (const { callback, targets } of resizeObservers) {
        if (targets.includes(anchor)) {
          callback([], {} as ResizeObserver)
        }
      }
    }

    const showToast = async () => {
      notifications.value = [
        { id: '1', message: 'Size updated.', type: 'SUCCESS' },
      ]
      await nextTick()
    }

    const scrollTo = async (y: number) => {
      window.scrollTo(0, y)
      window.dispatchEvent(new Event('scroll'))
      await nextTick()
    }

    const toastTop = () =>
      (wrapper.element as HTMLElement).style.getPropertyValue('--toast-top')

    const scrollListenerCalls = (spy: { mock: { calls: unknown[][] } }) =>
      spy.mock.calls.filter(([event]) => event === 'scroll').length

    beforeEach(() => {
      anchorBottomInPage = 108
      resizeObservers = []
      disconnectMock.mockClear()
      vi.stubGlobal(
        'ResizeObserver',
        class {
          private readonly targets: Element[] = []
          constructor(callback: ResizeObserverCallback) {
            resizeObservers.push({ callback, targets: this.targets })
          }
          observe(target: Element) {
            this.targets.push(target)
          }
          disconnect = () => {
            disconnectMock()
            this.targets.length = 0
          }
        },
      )
      window.scrollTo(0, 0)
    })

    it('places toasts just below the anchor when one appears', async () => {
      wrapper = mount(SFToastContainer, { props: { anchor } })

      await showToast()

      expect(toastTop()).toBe('108px')
    })

    it('places toasts below the anchor when they are already open at mount', () => {
      notifications.value = [
        { id: '1', message: 'Size updated.', type: 'SUCCESS' },
      ]

      wrapper = mount(SFToastContainer, { props: { anchor } })

      expect(toastTop()).toBe('108px')
    })

    // `Layout` passes its template ref, which is not set yet when the
    // container first renders.
    it('measures the anchor once it is passed in after mount', async () => {
      notifications.value = [
        { id: '1', message: 'Size updated.', type: 'SUCCESS' },
      ]
      wrapper = mount(SFToastContainer, { props: { anchor: null } })

      await wrapper.setProps({ anchor })
      resizeAnchor()
      await nextTick()

      expect(toastTop()).toBe('108px')
    })

    it('places toasts at the viewport top without an anchor', async () => {
      wrapper = mount(SFToastContainer)

      await showToast()

      expect(toastTop()).toBe('0px')
    })

    // The anchor's edge moves up with the page until it has scrolled out of
    // view, then toasts stay at the viewport top.
    it.for([
      [20, '88px'],
      [108, '0px'],
      [400, '0px'],
    ] as const)(
      'follows the anchor to %ipx of scroll',
      async ([scrollY, expected]) => {
        wrapper = mount(SFToastContainer, { props: { anchor } })
        await showToast()

        await scrollTo(scrollY)

        expect(toastTop()).toBe(expected)
      },
    )

    it('measures the anchor at the scroll position the first toast appears at', async () => {
      window.scrollTo(0, 30)
      wrapper = mount(SFToastContainer, { props: { anchor } })

      await showToast()
      await scrollTo(0)

      expect(toastTop()).toBe('108px')
    })

    // A ribbon closed under an open toast shrinks the anchor without a scroll.
    it('moves toasts with the anchor when it resizes while one is shown', async () => {
      wrapper = mount(SFToastContainer, { props: { anchor } })
      await showToast()

      anchorBottomInPage = 64
      resizeAnchor()
      await nextTick()

      expect(toastTop()).toBe('64px')
    })

    it('attaches no scroll listener while no toast is shown', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      wrapper = mount(SFToastContainer, { props: { anchor } })

      expect(scrollListenerCalls(addEventListenerSpy)).toBe(0)
      expect(resizeObservers).toHaveLength(0)
    })

    it('stops moving toasts with scroll and resize once the last toast closes', async () => {
      wrapper = mount(SFToastContainer, { props: { anchor } })
      await showToast()
      notifications.value = []
      await nextTick()

      await scrollTo(20)
      anchorBottomInPage = 64
      resizeAnchor()
      await nextTick()

      expect(toastTop()).toBe('108px')
    })

    it('stops tracking scroll and resize when unmounted with a toast shown', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      wrapper = mount(SFToastContainer, { props: { anchor } })
      await showToast()

      wrapper.unmount()

      expect(scrollListenerCalls(removeEventListenerSpy)).toBe(1)
      expect(disconnectMock).toHaveBeenCalled()
    })
  })
})
