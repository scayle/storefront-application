import { defineComponent, ref, nextTick } from 'vue'
import type { CSSProperties } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStickyColumn } from './useStickyColumn'

// Real refs, so the composable's `computed` re-evaluates when a test changes
// the viewport or the breakpoint mid-test.
const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    viewportHeight: ref(800),
    isSideBySide: ref(true),
    /** Captures the observer callback so a test can replay a resize. */
    notifyResize: undefined as ((height: number) => void) | undefined,
  }
})

vi.mock('@vueuse/core', () => ({
  useWindowSize: () => ({ height: mocks.viewportHeight }),
  tryOnMounted: (fn: () => void) => fn(),
  useResizeObserver: (
    target: { value?: HTMLElement },
    callback: () => void,
  ) => {
    // happy-dom lays nothing out, so a test drives the height directly and then
    // replays the observer callback the way a real resize would.
    mocks.notifyResize = (height: number) => {
      const element = target.value
      if (element) {
        Object.defineProperty(element, 'offsetHeight', {
          value: height,
          configurable: true,
        })
      }
      callback()
    }
  },
}))

vi.mock('@client/composables/useDefaultBreakpoints', () => ({
  useDefaultBreakpoints: () => ({
    greaterOrEqual: () => mocks.isSideBySide,
  }),
}))

const GAP = 32

const TestComponent = defineComponent({
  setup() {
    const column = ref<HTMLElement>()
    return { column, style: useStickyColumn(column, GAP) }
  },
  template: `<div ref="column" :style="style" data-testid="column" />`,
})

const mountColumn = () => {
  const wrapper = mount(TestComponent, { attachTo: document.body })
  return {
    resizeTo: (height: number) => mocks.notifyResize?.(height),
    style: () => wrapper.vm.style as CSSProperties,
  }
}

describe('useStickyColumn', () => {
  beforeEach(() => {
    mocks.viewportHeight.value = 800
    mocks.isSideBySide.value = true
    mocks.notifyResize = undefined
  })

  it('offers no offset before the column has been measured', () => {
    // Matches the server render, so hydration does not report a style mismatch.
    expect(mountColumn().style()).toEqual({})
  })

  it('pins a column that fits the viewport below the top edge', () => {
    const column = mountColumn()

    column.resizeTo(600)

    expect(column.style()).toEqual({ top: `${GAP}px` })
  })

  it.for([
    // A column taller than the viewport anchors to its own bottom edge:
    // 800 - 1600 - 32 is negative, so it keeps scrolling until its bottom edge
    // sits `GAP` above the viewport bottom.
    { height: 1600, top: '-832px' },
    // `viewport - GAP * 2` is the tallest column that still clears both gaps
    // while pinned below the top edge. One pixel taller and the bottom edge
    // would drop under the viewport, so the offset starts shrinking instead.
    { height: 800 - GAP * 2, top: `${GAP}px` },
    { height: 800 - GAP * 2 + 10, top: `${GAP - 10}px` },
    // An accordion expanding flips a fitting column into a tall one, and the
    // offset re-resolves to the bottom-anchored value.
    { height: 1000, top: '-232px' },
  ])(
    'resolves the offset for a $height px column to $top',
    ({ height, top }) => {
      const column = mountColumn()

      column.resizeTo(height)

      expect(column.style()).toEqual({ top })
    },
  )

  it('measures the column on mount rather than waiting for a resize', async () => {
    // A page that starts out hidden gets no rendering opportunity, so the
    // observer stays silent. The mount measurement is what makes the offset
    // correct from the first paint instead of from the first resize.
    const offsetHeight = vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(600)

    try {
      const column = mountColumn()
      await nextTick()

      expect(column.style()).toEqual({ top: `${GAP}px` })
    } finally {
      // Restored even when the assertion above fails.
      offsetHeight.mockRestore()
    }
  })

  it('re-resolves the offset when the column grows past the viewport', () => {
    const column = mountColumn()

    // An accordion expanding is what flips a fitting column into a tall one.
    column.resizeTo(600)
    expect(column.style()).toEqual({ top: `${GAP}px` })

    column.resizeTo(1000)
    expect(column.style()).toEqual({ top: '-232px' })
  })

  it('re-resolves the offset when the viewport is resized', async () => {
    const column = mountColumn()
    column.resizeTo(700)

    expect(column.style()).toEqual({ top: `${GAP}px` })

    mocks.viewportHeight.value = 600
    await nextTick()

    expect(column.style()).toEqual({ top: '-132px' })
  })

  it('offers no offset while the columns are stacked', () => {
    mocks.isSideBySide.value = false
    const column = mountColumn()

    column.resizeTo(600)

    expect(column.style()).toEqual({})
  })
})
