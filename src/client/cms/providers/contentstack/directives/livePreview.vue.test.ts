import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { vLivePreview } from './livePreview'

const directives = { 'live-preview': vLivePreview }

/**
 * Mounts a component that renders one element with the directive and the given
 * binding, for example `:title` or `:content__0.loop`.
 */
function mountWithDirective(
  binding: string,
  value: Record<string, unknown> | undefined,
) {
  const Comp = defineComponent({
    directives,
    props: { element: { type: Object, default: undefined } },
    template: `<div v-live-preview${binding}="element" />`,
  })

  return mount(Comp, { props: { element: value } })
}

describe('vLivePreview', () => {
  it('sets data-cslp from the root $ metadata', () => {
    const wrapper = mountWithDirective('', {
      $: { 'data-cslp': 'page.uid.title' },
    })

    expect(wrapper.find('div').attributes('data-cslp')).toBe('page.uid.title')
  })

  it('sets data-cslp for a specific field via argument', () => {
    const wrapper = mountWithDirective(':title', {
      $: {
        'data-cslp': 'page.uid',
        title: { 'data-cslp': 'page.uid.title' },
      },
    })

    expect(wrapper.find('div').attributes('data-cslp')).toBe('page.uid.title')
  })

  it('removes data-cslp when field metadata is missing', () => {
    const wrapper = mountWithDirective(':missing_field', {
      $: { 'data-cslp': 'page.uid' },
    })

    expect(wrapper.find('div').attributes('data-cslp')).toBeUndefined()
  })

  it('removes data-cslp when $ is undefined', () => {
    const wrapper = mountWithDirective('', {})

    expect(wrapper.find('div').attributes('data-cslp')).toBeUndefined()
  })

  it('sets data-cslp-loop marker with .loop modifier', () => {
    const div = mountWithDirective(':content__0.loop', {
      $: { content__0: { 'data-cslp': 'page.uid.content__0' } },
    }).find('div')

    expect(div.attributes('data-cslp')).toBe('page.uid.content__0')
    expect(div.attributes('data-cslp-loop')).toBe('true')
  })

  it('does not overwrite loop-marked elements without .loop modifier', () => {
    const el = mountWithDirective(':content__0.loop', {
      $: { content__0: { 'data-cslp': 'page.uid.content__0' } },
    }).find('div').element

    // Called directly: in a rendered tree Vue runs a parent's `.loop` directive
    // after the block's own directive on the same root, so a non-loop update
    // never lands last and the guard cannot be observed through a prop change.
    vLivePreview.updated(el, {
      value: {
        $: { 'data-cslp': 'page.uid.overwrite-attempt' },
      },
      arg: undefined,
      modifiers: {},
    } as any)

    expect(el.getAttribute('data-cslp')).toBe('page.uid.content__0')
  })

  it('does nothing when binding value is falsy', () => {
    const div = mountWithDirective('', undefined).find('div')

    expect(div.attributes('data-cslp')).toBeUndefined()
    expect(div.attributes('data-cslp-loop')).toBeUndefined()
  })

  it('updates data-cslp when value changes', async () => {
    const wrapper = mountWithDirective('', {
      $: { 'data-cslp': 'page.uid.v1' },
    })

    expect(wrapper.find('div').attributes('data-cslp')).toBe('page.uid.v1')

    await wrapper.setProps({
      element: { $: { 'data-cslp': 'page.uid.v2' } },
    })

    expect(wrapper.find('div').attributes('data-cslp')).toBe('page.uid.v2')
  })
})
