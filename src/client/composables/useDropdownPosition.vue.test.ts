import { defineComponent, nextTick, ref, useTemplateRef } from 'vue'
import type { CSSProperties } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDropdownPosition } from './useDropdownPosition'

const mocks = vi.hoisted(() => ({
  reducedMotion: { value: 'no-preference' as 'no-preference' | 'reduce' },
}))

vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  usePreferredReducedMotion: () => mocks.reducedMotion,
}))

const VIEWPORT_WIDTH = 1000
const VIEWPORT_HEIGHT = 900
const TRIGGER_WIDTH = 120
const PANEL_HEIGHT = 310

// happy-dom lays nothing out, so a test sets the trigger's box directly.
let triggerRect: DOMRect

const mountPosition = ({
  open = false,
  mobile = false,
  insideDialog = false,
} = {}) => {
  const isOpen = ref(open)
  const onResize = vi.fn()
  const Host = defineComponent({
    setup() {
      const anchor = useTemplateRef<HTMLElement>('anchor')
      const panel = useTemplateRef<HTMLElement>('panel')
      return {
        style: useDropdownPosition({
          anchor,
          panel,
          isOpen,
          isMobile: ref(mobile),
          onResize,
        }),
      }
    },
    template: insideDialog
      ? '<dialog><div ref="anchor" /><div ref="panel" /></dialog>'
      : '<div><div ref="anchor" /><div ref="panel" /></div>',
  })
  const wrapper = mount(Host, { attachTo: document.body })

  return {
    wrapper,
    onResize,
    open: async () => {
      isOpen.value = true
      // The listeners attach in the post-render flush, and the check for
      // space below the trigger runs a tick after it.
      await flushPromises()
    },
    close: async () => {
      isOpen.value = false
      await nextTick()
    },
    style: () => wrapper.vm.style as CSSProperties | undefined,
  }
}

describe('useDropdownPosition', () => {
  beforeEach(() => {
    triggerRect = new DOMRect(100, 10, TRIGGER_WIDTH, 40)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => triggerRect,
    )
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(
      TRIGGER_WIDTH,
    )
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(
      PANEL_HEIGHT,
    )
    vi.stubGlobal('innerWidth', VIEWPORT_WIDTH)
    vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT)
    vi.stubGlobal('scrollBy', vi.fn())
    mocks.reducedMotion.value = 'no-preference'
  })

  it('leaves the panel unstyled while it has not been opened', () => {
    expect(mountPosition().style()).toBeUndefined()
  })

  it("anchors the open panel 4px below the trigger's left edge on desktop", async () => {
    const position = mountPosition()

    await position.open()

    expect(position.style()).toMatchObject({
      position: 'fixed',
      left: '100px',
      top: '54px',
      width: 'max-content',
    })
  })

  // The panel is never narrower than the trigger, unless the trigger runs past
  // the space left to the right of it, and never less than twice the padding.
  it.for([
    { left: 100, minWidth: '120px', maxWidth: '892px' },
    { left: 950, minWidth: '42px', maxWidth: '42px' },
    { left: 995, minWidth: '16px', maxWidth: '16px' },
  ])(
    'sizes the panel between $minWidth and $maxWidth with the trigger at $left px',
    async ({ left, minWidth, maxWidth }) => {
      triggerRect = new DOMRect(left, 10, TRIGGER_WIDTH, 40)
      const position = mountPosition()

      await position.open()

      expect(position.style()).toMatchObject({ minWidth, maxWidth })
    },
  )

  it('keeps the panel below a trigger that leaves it just enough room', async () => {
    // Boundary: the lowest trigger position where the panel still fits below.
    // 538 (trigger top) + 40 (trigger) + 4 (gap) + 310 (panel) + 8 (padding) = 900.
    triggerRect = new DOMRect(100, 538, TRIGGER_WIDTH, 40)
    const position = mountPosition()

    await position.open()

    expect(position.style()).toMatchObject({ top: '582px', bottom: 'auto' })
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('opens the panel above a trigger near the bottom of the viewport', async () => {
    triggerRect = new DOMRect(100, 840, TRIGGER_WIDTH, 40)
    const position = mountPosition()

    await position.open()

    // `bottom` counts from the lower viewport edge:
    // 900 (viewport) - 840 (trigger top) + 4 (gap) = 64.
    expect(position.style()).toMatchObject({ top: 'auto', bottom: '64px' })
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('keeps the panel above the trigger while the page scrolls', async () => {
    triggerRect = new DOMRect(100, 840, TRIGGER_WIDTH, 40)
    const position = mountPosition()
    await position.open()

    triggerRect = new DOMRect(100, 400, TRIGGER_WIDTH, 40)
    window.dispatchEvent(new Event('scroll'))

    expect(position.style()).toMatchObject({ top: 'auto', bottom: '504px' })
  })

  it('opens below again once the trigger has room below it', async () => {
    triggerRect = new DOMRect(100, 840, TRIGGER_WIDTH, 40)
    const position = mountPosition()
    await position.open()
    await position.close()

    triggerRect = new DOMRect(100, 10, TRIGGER_WIDTH, 40)
    await position.open()

    expect(position.style()).toMatchObject({ top: '54px', bottom: 'auto' })
  })

  it('opens the panel above a trigger that leaves it just enough room above', async () => {
    // Boundary: the highest trigger position where the panel still fits above.
    // 322 (trigger top) - 4 (gap) - 8 (padding) = 310 (panel).
    vi.stubGlobal('innerHeight', 500)
    triggerRect = new DOMRect(100, 322, TRIGGER_WIDTH, 40)
    const position = mountPosition()

    await position.open()

    expect(position.style()).toMatchObject({ top: 'auto', bottom: '182px' })
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('scrolls the page when the panel fits neither below nor above the trigger', async () => {
    // One pixel higher than the boundary above, so the panel no longer fits there.
    vi.stubGlobal('innerHeight', 500)
    triggerRect = new DOMRect(100, 321, TRIGGER_WIDTH, 40)
    const position = mountPosition()

    await position.open()

    expect(position.style()).toMatchObject({ top: '365px', bottom: 'auto' })
    // The page scrolls by the part of the panel that is below the viewport.
    // 321 (trigger top) + 40 (trigger) + 4 (gap) + 310 (panel) + 8 (padding) = 683,
    // and 683 - 500 (viewport) = 183.
    expect(window.scrollBy).toHaveBeenCalledExactlyOnceWith({
      top: 183,
      behavior: 'smooth',
    })
  })

  it('scrolls without animation when the user prefers reduced motion', async () => {
    mocks.reducedMotion.value = 'reduce'
    vi.stubGlobal('innerHeight', 500)
    triggerRect = new DOMRect(100, 300, TRIGGER_WIDTH, 40)
    const position = mountPosition()

    await position.open()

    expect(window.scrollBy).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ behavior: 'instant' }),
    )
  })

  it('leaves the page alone when the trigger sits inside a dialog', async () => {
    vi.stubGlobal('innerHeight', 500)
    triggerRect = new DOMRect(100, 300, TRIGGER_WIDTH, 40)
    const position = mountPosition({ insideDialog: true })

    await position.open()

    expect(position.style()).toMatchObject({ top: '344px', bottom: 'auto' })
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('leaves the page alone when the mobile sheet opens', async () => {
    // The panel fits on neither side here, so a desktop panel would scroll.
    vi.stubGlobal('innerHeight', 500)
    triggerRect = new DOMRect(100, 300, TRIGGER_WIDTH, 40)
    const position = mountPosition({ mobile: true })

    await position.open()

    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('docks the open panel to the bottom of the viewport on mobile', async () => {
    const position = mountPosition({ mobile: true })

    await position.open()

    expect(position.style()).toEqual({
      position: 'fixed',
      left: '0',
      right: '0',
      bottom: '0',
      top: 'auto',
    })
  })

  it('positions a panel that is open on mount once mounted', async () => {
    const position = mountPosition({ open: true })

    await flushPromises()

    expect(position.style()).toMatchObject({ left: '100px', top: '54px' })
  })

  it('listens from mount when the panel is open on mount', async () => {
    const position = mountPosition({ open: true })
    await flushPromises()

    window.dispatchEvent(new Event('resize'))

    expect(position.onResize).toHaveBeenCalledOnce()
  })

  it('follows the trigger when the page scrolls while open', async () => {
    const position = mountPosition()
    await position.open()

    triggerRect = new DOMRect(100, 210, TRIGGER_WIDTH, 40)
    window.dispatchEvent(new Event('scroll'))

    expect(position.style()).toMatchObject({ top: '254px' })
  })

  it('calls onResize without arguments when the viewport resizes while open', async () => {
    const position = mountPosition()
    await position.open()

    window.dispatchEvent(new Event('resize'))

    expect(position.onResize).toHaveBeenCalledExactlyOnceWith()
  })

  it('stops listening once the panel closes', async () => {
    const position = mountPosition()
    await position.open()
    await position.close()

    window.dispatchEvent(new Event('resize'))

    expect(position.onResize).not.toHaveBeenCalled()
  })

  it('stops listening once the component unmounts while open', async () => {
    const position = mountPosition()
    await position.open()
    position.wrapper.unmount()
    const measure = vi.mocked(HTMLElement.prototype.getBoundingClientRect)
    measure.mockClear()

    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('scroll'))

    expect(position.onResize).not.toHaveBeenCalled()
    expect(measure).not.toHaveBeenCalled()
  })
})
