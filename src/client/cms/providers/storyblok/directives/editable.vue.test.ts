import type { SbBlokData } from '@storyblok/js'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { vEditable } from './editable'

vi.mock('@storyblok/js', () => ({
  storyblokEditable: (blok: { _editable?: string }) =>
    blok?._editable
      ? { 'data-blok-c': '{"id":"1"}', 'data-blok-uid': '1-2' }
      : {},
}))

const mountWith = (blok: SbBlokData) => {
  const Comp = defineComponent({
    directives: { editable: vEditable },
    props: { blok: { type: Object, required: true } },
    template: '<div v-editable="blok" data-testid="el"></div>',
  })

  return mount(Comp, { props: { blok } })
}

describe('vEditable', () => {
  it('applies editor attributes when the blok carries _editable', async () => {
    const wrapper = mountWith({ _editable: '<!--#storyblok#{"id":"1"}-->' })
    await flushPromises()
    const el = wrapper.get('[data-testid="el"]')
    expect(el.attributes('data-blok-c')).toBe('{"id":"1"}')
    expect(el.attributes('data-blok-uid')).toBe('1-2')
    expect(el.classes()).toContain('storyblok__outline')
  })

  it('is a no-op when the blok has no _editable', async () => {
    const wrapper = mountWith({})
    await flushPromises()
    const el = wrapper.get('[data-testid="el"]')
    expect(el.attributes('data-blok-c')).toBeUndefined()
    expect(el.classes()).not.toContain('storyblok__outline')
  })
})
