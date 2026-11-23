import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SFProductImageBase from './SFProductImageBase.vue'

vi.mock('@assets/icons/utility/image-placeholder.svg', () => ({
  default: {
    name: 'IconImagePlaceholder',
    template: '<svg data-testid="image-placeholder-icon" />',
  },
}))

vi.mock('@client/utils/initialRender', () => ({
  isInitialRender: vi.fn(() => true),
  markNavigated: vi.fn(),
}))

const defaultProps = {
  variant: 'product',
  alt: 'Test product',
  src: '/product-1-big.avif',
  srcSet: '/product-1-big.avif',
  sizes: '100vw',
} as const

const mountBase = (props: Record<string, unknown> = {}) =>
  mount(SFProductImageBase, { props: { ...defaultProps, ...props } })

// Matches every padding utility, sides and axes included, so the cases without
// padding still catch padding a shop adds with another step or on one side.
const framePadding = (wrapper: ReturnType<typeof mountBase>) =>
  wrapper
    .get('div')
    .classes()
    .filter((name) => /^p[a-z]?-/.test(name))

describe('SFProductImageBase frame padding', () => {
  it.for([
    { condition: 'by default', props: {} },
    { condition: 'when applyPadding is false', props: { applyPadding: false } },
    {
      condition: 'while applyPadding is off, whatever the paddingSize',
      props: { applyPadding: false, paddingSize: 'compact' },
    },
    {
      condition: 'on a thumbnail while applyPadding is off',
      props: {
        variant: 'thumbnail',
        applyPadding: false,
        paddingSize: 'compact',
      },
    },
  ] as const)('leaves the frame without padding $condition', ({ props }) => {
    expect(framePadding(mountBase(props))).toEqual([])
  })

  it('pads the frame with the default step when applyPadding is true', () => {
    expect(framePadding(mountBase({ applyPadding: true }))).toEqual(['p-4'])
  })

  it('pads the frame with the compact step for swatch sized frames', () => {
    expect(
      framePadding(mountBase({ applyPadding: true, paddingSize: 'compact' })),
    ).toEqual(['p-1'])
  })

  it('keeps the frame padded once the image has loaded', async () => {
    const wrapper = mountBase({ applyPadding: true })

    await wrapper.get('img').trigger('load')

    expect(framePadding(wrapper)).toEqual(['p-4'])
  })

  it('keeps the frame padded in the error state', async () => {
    const wrapper = mountBase({ applyPadding: true })

    await wrapper.get('img').trigger('error')

    expect(wrapper.find('[data-testid="product-image-error"]').exists()).toBe(
      true,
    )
    expect(framePadding(wrapper)).toEqual(['p-4'])
  })

  // Thumbnails use their own frame base, but a trimmed asset needs the same room
  // there as on the product card swatch, so the padding applies to both variants.
  it('pads the thumbnail frame with the step it was given', () => {
    expect(
      framePadding(
        mountBase({
          variant: 'thumbnail',
          applyPadding: true,
          paddingSize: 'compact',
        }),
      ),
    ).toEqual(['p-1'])
  })
})

describe('SFProductImageBase SSR visibility', () => {
  it('does not render the invisible class on the initial render', () => {
    const wrapper = mountBase()

    const img = wrapper.get('img')
    expect(img.classes()).not.toContain('invisible')
  })

  it('re-arms the skeleton when the src prop changes on a mounted instance', async () => {
    const wrapper = mountBase()

    await wrapper.setProps({ src: 'https://example.com/b.jpg' })

    const img = wrapper.get('img')
    expect(img.classes()).toContain('invisible')
  })
})
