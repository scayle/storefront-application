import { createSSRApp, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { ImagePriorityOverrides } from './useLcpPriority'
import {
  CMS_EAGER_LOADING_COUNT,
  provideLcpPriority,
  resolveImagePriority,
  useLcpPriority,
} from './useLcpPriority'

const Claimer = defineComponent({
  setup() {
    const index = useLcpPriority().claim()
    return () => h('span', { 'data-index': String(index) })
  },
})

const indices = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('span').map((s) => s.attributes('data-index'))

describe('useLcpPriority', () => {
  it('assigns each image its 0-based document-order position', () => {
    const Page = defineComponent({
      setup() {
        provideLcpPriority()
        return () => h('div', [h(Claimer), h(Claimer), h(Claimer)])
      },
    })

    expect(indices(mount(Page))).toEqual(['0', '1', '2'])
  })

  it('assigns the parent container its position before its nested images', () => {
    // Mirrors a SectionComponent that claims in its own setup and then renders
    // nested ImageComponents — the parent runs setup first, so it wins index 0.
    const Section = defineComponent({
      setup() {
        const index = useLcpPriority().claim()
        return () =>
          h('section', { 'data-index': String(index) }, [
            h(Claimer),
            h(Claimer),
          ])
      },
    })
    const Page = defineComponent({
      setup() {
        provideLcpPriority()
        return () => h('div', [h(Section)])
      },
    })

    const wrapper = mount(Page)
    expect(wrapper.find('section').attributes('data-index')).toBe('0')
    expect(indices(wrapper)).toEqual(['1', '2'])
  })

  it('assigns the same indices on the server and during hydration', async () => {
    // The helper's core guarantee is that SSR and hydration assign the same
    // indices, so a mismatch warning here would mean a flipped LCP image.
    const Page = defineComponent({
      setup() {
        provideLcpPriority()
        return () => h('div', [h(Claimer), h(Claimer), h(Claimer)])
      },
    })

    const container = document.createElement('div')
    container.innerHTML = await renderToString(createSSRApp(Page))

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    createSSRApp(Page).mount(container)

    const hydrationComplaints = [...warn.mock.calls, ...error.mock.calls]
      .map((call) => String(call[0]))
      .filter((message) => message.toLowerCase().includes('hydration'))
    expect(hydrationComplaints).toEqual([])

    const seen = Array.from(container.querySelectorAll('span'), (s) =>
      s.getAttribute('data-index'),
    )
    expect(seen).toEqual(['0', '1', '2'])
  })

  it('resolves to -1 when no page provided a claim', () => {
    expect(mount(Claimer).attributes('data-index')).toBe('-1')
  })

  it('provides a fresh claim per page render', () => {
    const Page = defineComponent({
      setup() {
        provideLcpPriority()
        return () => h('div', [h(Claimer), h(Claimer)])
      },
    })

    expect(indices(mount(Page))).toEqual(['0', '1'])
    // A second, independent page render starts counting from zero again.
    expect(indices(mount(Page))).toEqual(['0', '1'])
  })
})

describe('resolveImagePriority', () => {
  it.for([
    {
      case: 'marks the first image high and eager by default',
      index: 0,
      overrides: {},
      expected: { fetchPriority: 'high', loading: 'eager' },
    },
    {
      // Index 1 is past the high-priority slot but still inside the eager
      // window: loading is decoupled from fetchpriority so a visible grid cell
      // next to the hero is not lazy-loaded.
      case: 'keeps in-window followers eager but at auto priority',
      index: 1,
      overrides: {},
      expected: { fetchPriority: 'auto', loading: 'eager' },
    },
    {
      case: 'marks images past the eager window auto and lazy',
      index: CMS_EAGER_LOADING_COUNT,
      overrides: {},
      expected: { fetchPriority: 'auto', loading: 'lazy' },
    },
    {
      case: 'marks unclaimed images (-1) auto and lazy',
      index: -1,
      overrides: {},
      expected: { fetchPriority: 'auto', loading: 'lazy' },
    },
    {
      case: 'lets explicit overrides win over the claim',
      index: 0,
      overrides: { fetchPriority: 'low', loading: 'lazy' },
      expected: { fetchPriority: 'low', loading: 'lazy' },
    },
    {
      case: 'applies each override independently',
      index: -1,
      overrides: { fetchPriority: 'high' },
      expected: { fetchPriority: 'high', loading: 'lazy' },
    },
  ] satisfies {
    case: string
    index: number
    overrides: ImagePriorityOverrides
    expected: ReturnType<typeof resolveImagePriority>
  }[])('$case', ({ index, overrides, expected }) => {
    expect(resolveImagePriority(index, overrides)).toEqual(expected)
  })
})
