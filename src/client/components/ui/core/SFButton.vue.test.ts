import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { SFLinkStub } from '@test/stubs/common'
import SFButton from './SFButton.vue'

const linkStubs = { SFLink: SFLinkStub }

describe('SFButton', () => {
  it('defaults to type="button" so it does not implicitly submit forms', () => {
    const wrapper = mount(SFButton)

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('forwards an explicit type="submit" to the rendered button', () => {
    const wrapper = mount(SFButton, { props: { type: 'submit' } })

    expect(wrapper.attributes('type')).toBe('submit')
  })

  it('does not render a type attribute when rendered as a link (to prop set)', () => {
    const wrapper = mount(SFButton, {
      props: { to: '/foo' },
      global: { stubs: linkStubs },
    })

    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('type')).toBeUndefined()
  })

  it.for<{
    case: string
    props: InstanceType<typeof SFButton>['$props']
    attrs?: Record<string, unknown>
    expected: string
  }>([
    { case: 'an enabled native button', props: {}, expected: '0' },
    {
      case: 'a disabled native button',
      props: { disabled: true },
      expected: '-1',
    },
    {
      case: 'an enabled button with a caller tabindex',
      props: {},
      attrs: { tabindex: -1 },
      expected: '-1',
    },
    {
      case: 'a disabled button with a caller tabindex',
      props: { disabled: true },
      attrs: { tabindex: 0 },
      expected: '-1',
    },
    {
      case: 'a disabled link-mode button',
      props: { to: '/foo', disabled: true },
      expected: '-1',
    },
  ])('sets tabindex $expected on $case', ({ props, attrs, expected }) => {
    const wrapper = mount(SFButton, {
      props,
      attrs,
      global: { stubs: linkStubs },
    })

    expect(wrapper.attributes('tabindex')).toBe(expected)
  })

  it('emits the native disabled attribute when disabled', () => {
    const wrapper = mount(SFButton, { props: { disabled: true } })

    expect(wrapper.attributes('disabled')).toBe('')
  })

  it('does not emit disabled on an enabled button', () => {
    const wrapper = mount(SFButton)

    expect(wrapper.attributes('disabled')).toBeUndefined()
  })

  it('emits click from an enabled link-mode button', async () => {
    const wrapper = mount(SFButton, {
      props: { to: '/foo' },
      global: { stubs: linkStubs },
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  // A link cannot be natively disabled, so the click handler drops the click.
  it.for([
    { case: 'disabled', props: { disabled: true } },
    { case: 'loading', props: { loading: true } },
  ] as const)(
    'swallows the click of a $case link-mode button',
    async ({ props }) => {
      const wrapper = mount(SFButton, {
        props: { to: '/foo', ...props },
        global: { stubs: linkStubs },
      })

      await wrapper.trigger('click')

      expect(wrapper.emitted('click')).toBeUndefined()
    },
  )

  // An icon-only button gets an explicit width alongside its height, so it stays
  // square without `aspect-square`, whose aspect-ratio is unreliable on flex
  // items in Safari. A labelled button keeps a height only so its width follows
  // the label.
  it.for([
    {
      case: 'an icon-only secondary button',
      variant: 'secondary',
      slots: { 'prepend-icon': '<svg />' },
      shape: 'size-',
    },
    {
      case: 'an icon-only plain button',
      variant: 'plain',
      slots: { 'prepend-icon': '<svg />' },
      shape: 'size-',
    },
    {
      case: 'a labelled secondary button',
      variant: 'secondary',
      slots: { default: 'Add to basket' },
      shape: 'h-',
    },
  ] as const)(
    'sizes $case with $shape classes only',
    ({ variant, slots, shape }) => {
      const wrapper = mount(SFButton, {
        props: { size: 'lg', variant },
        slots,
      })

      // The classes that give the button its width and height: `size-*` sets
      // both, `h-*` only the height.
      const shapes = wrapper
        .classes()
        .filter((name) => /^(?:size|h)-\d/.test(name))
      expect(shapes).not.toHaveLength(0)
      expect(shapes.every((name) => name.startsWith(shape))).toBe(true)
    },
  )

  it.for([
    { shape: 'labelled', slots: { default: 'Reset' } },
    { shape: 'icon-only', slots: { 'prepend-icon': '<svg />' } },
  ] as const)(
    'extends the pointer target of a small $shape plain button to 24px',
    ({ slots }) => {
      const wrapper = mount(SFButton, {
        props: { size: 'sm', variant: 'plain' },
        slots,
      })

      expect(wrapper.classes()).toContain('hit-area-min')
    },
  )

  it('leaves the pointer target of a medium plain button at its visible size', () => {
    const wrapper = mount(SFButton, {
      props: { size: 'md', variant: 'plain' },
      slots: { 'prepend-icon': '<svg />' },
    })

    expect(wrapper.classes()).not.toContain('hit-area-min')
  })
})
