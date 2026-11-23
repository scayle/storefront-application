import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SFItemSlider from './SFItemSlider.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const mountComponent = (
  props: Record<string, unknown> = {},
  attachTo?: Element,
) =>
  mount(SFItemSlider, {
    props,
    attachTo,
    global: { mocks: { $t: (key: string) => key } },
  })

describe('SFItemSlider', () => {
  it('names the scroll container as a group when sliderLabel is set', () => {
    const wrapper = mountComponent({ sliderLabel: 'Carousel' })
    const scroller = wrapper.get('[data-testid="items-slider-scrollable"]')

    expect(scroller.attributes('role')).toBe('group')
    expect(scroller.attributes('aria-label')).toBe('Carousel')
  })

  it('leaves the scroll container without a role when sliderLabel is unset', () => {
    const wrapper = mountComponent()

    expect(
      wrapper.get('[data-testid="items-slider-scrollable"]').attributes('role'),
    ).toBeUndefined()
  })

  // Guards against adding tabindex="-1" back, which hid the default arrows
  // from keyboard users.
  it('keeps the default arrow buttons in the tab order', () => {
    const buttons = mountComponent({ withArrows: true }).findAll(
      'button[aria-label]',
    )

    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(button.attributes('tabindex')).toBeUndefined()
    }
  })

  // happy-dom reports no scroll range, so both arrows sit at a boundary once
  // the first scroll check has run. A natively disabled button would drop
  // keyboard focus to the document here.
  it.for(['horizontal', 'vertical'] as const)(
    'keeps a default arrow focusable at a %s scroll boundary',
    async (mode) => {
      const wrapper = mountComponent({ withArrows: true, mode }, document.body)
      await nextTick()
      const next = wrapper.get<HTMLButtonElement>(
        'button[aria-label="slider.go_to_next_item"]',
      )

      expect(next.attributes('aria-disabled')).toBe('true')
      expect(next.attributes('disabled')).toBeUndefined()
      next.element.focus()
      expect(document.activeElement).toBe(next.element)

      wrapper.unmount()
    },
  )

  describe('forward Tab from the next arrow', () => {
    // happy-dom has no layout, so each item reads its position from
    // `data-left` inside a 300px wide slider.
    const mountWithItems = (lefts: number[]) =>
      mount(SFItemSlider, {
        props: { withArrows: true },
        attachTo: document.body,
        slots: {
          default: lefts
            .map(
              (left, i) =>
                `<div data-left="${left}"><button type="button">Item ${i}</button></div>`,
            )
            .join(''),
        },
        global: { mocks: { $t: (key: string) => key } },
      })

    const stubLayout = () => {
      vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([
        new DOMRect(),
      ] as unknown as DOMRectList)
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: Element) {
          const left = Number(
            this.closest('[data-left]')?.getAttribute('data-left') ?? 0,
          )
          const isSlider = this.matches(
            '[data-testid="items-slider-scrollable"]',
          )
          return new DOMRect(left, 0, isSlider ? 300 : 100, 100)
        },
      )
    }

    const pressTabOnNext = (wrapper: ReturnType<typeof mountWithItems>) => {
      const next = wrapper.get<HTMLButtonElement>(
        'button[aria-label="slider.go_to_next_item"]',
      ).element
      next.focus()
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      })
      next.dispatchEvent(event)
      return event
    }

    it('moves focus to the first item in view when the slider is scrolled', () => {
      stubLayout()
      const wrapper = mountWithItems([-200, -100, 0, 100, 200])

      const event = pressTabOnNext(wrapper)

      expect(event.defaultPrevented).toBe(true)
      expect(document.activeElement?.textContent).toBe('Item 2')
      wrapper.unmount()
    })

    it('leaves the Tab to the browser when the first item is in view', () => {
      stubLayout()
      const wrapper = mountWithItems([0, 100, 200, 300])

      expect(pressTabOnNext(wrapper).defaultPrevented).toBe(false)
      wrapper.unmount()
    })
  })
})
