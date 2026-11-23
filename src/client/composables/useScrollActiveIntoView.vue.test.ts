import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { useScrollActiveIntoView } from './useScrollActiveIntoView'

const mocks = vi.hoisted(() => ({
  reducedMotion: { value: 'no-preference' as 'no-preference' | 'reduce' },
}))

vi.mock('@vueuse/core', () => ({
  usePreferredReducedMotion: () => mocks.reducedMotion,
}))

const TestComponent = defineComponent({
  setup() {
    const { navRef, onItemClick } = useScrollActiveIntoView()
    return { navRef, onItemClick }
  },
  template: `
    <nav ref="navRef">
      <a href="#first" data-testid="first" @click="onItemClick">First</a>
      <a href="#second" data-testid="second" aria-current="page" @click="onItemClick">Second</a>
      <a href="#third" data-testid="third" @click="onItemClick">Third</a>
    </nav>
  `,
})

describe('useScrollActiveIntoView', () => {
  let scrollIntoView: MockInstance<Element['scrollIntoView']>

  beforeEach(() => {
    mocks.reducedMotion.value = 'no-preference'
    // A spy, not an assignment, so `restoreMocks` puts the prototype back.
    // Assigning and resetting leaves an own `undefined` on
    // HTMLElement.prototype that shadows Element.prototype for later test
    // files in the same vmThreads worker.
    scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
  })

  it('scrolls the active item into view instantly on mount', () => {
    const wrapper = mount(TestComponent, { attachTo: document.body })
    const active = wrapper.get('[aria-current="page"]').element

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({
      inline: 'nearest',
      block: 'nearest',
      behavior: 'instant',
    })
    expect(scrollIntoView.mock.instances[0]).toBe(active)
  })

  it('does nothing on mount when no item is marked active', () => {
    const NoActive = defineComponent({
      setup() {
        const { navRef } = useScrollActiveIntoView()
        return { navRef }
      },
      template: `<nav ref="navRef"><a href="#a">A</a></nav>`,
    })

    mount(NoActive, { attachTo: document.body })

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('smoothly scrolls a clicked item into view', async () => {
    const wrapper = mount(TestComponent, { attachTo: document.body })
    const third = wrapper.get('[data-testid="third"]')
    scrollIntoView.mockClear()

    await third.trigger('click')

    expect(scrollIntoView).toHaveBeenCalledWith({
      inline: 'nearest',
      block: 'nearest',
      behavior: 'smooth',
    })
    expect(scrollIntoView.mock.instances[0]).toBe(third.element)
  })

  it('resolves the clicked anchor from a nested click target', async () => {
    const TestComponentWithNested = defineComponent({
      setup() {
        const { navRef, onItemClick } = useScrollActiveIntoView()
        return { navRef, onItemClick }
      },
      template: `
        <nav ref="navRef">
          <a href="#third" data-testid="third" @click="onItemClick">
            <span data-testid="nested">Third</span>
          </a>
        </nav>
      `,
    })
    const wrapper = mount(TestComponentWithNested, { attachTo: document.body })
    const nested = wrapper.get('[data-testid="nested"]')
    scrollIntoView.mockClear()

    await nested.trigger('click')

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.instances[0]).toBe(
      wrapper.get('[data-testid="third"]').element,
    )
  })

  it('jumps instantly on click when the user prefers reduced motion', async () => {
    mocks.reducedMotion.value = 'reduce'
    const wrapper = mount(TestComponent, { attachTo: document.body })
    const third = wrapper.get('[data-testid="third"]')
    scrollIntoView.mockClear()

    await third.trigger('click')

    expect(scrollIntoView).toHaveBeenCalledWith({
      inline: 'nearest',
      block: 'nearest',
      behavior: 'instant',
    })
  })

  it('ignores clicks that do not originate from an anchor', async () => {
    const NonAnchorClick = defineComponent({
      setup() {
        const { navRef, onItemClick } = useScrollActiveIntoView()
        return { navRef, onItemClick }
      },
      template: `
        <nav ref="navRef" @click="onItemClick">
          <span data-testid="non-anchor">Not a link</span>
        </nav>
      `,
    })
    const wrapper = mount(NonAnchorClick, { attachTo: document.body })
    scrollIntoView.mockClear()

    await wrapper.get('[data-testid="non-anchor"]').trigger('click')

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
