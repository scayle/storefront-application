import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { buildImageVariant } from '@scayle/storefront/shared'
import { ThumbnailSize } from '@client/utils/constants'
import { IMAGE_VARIANTS } from '@shared/constants/imageVariants'
import SFProductThumbnail from './SFProductThumbnail.vue'

vi.mock('@assets/icons/utility/image-placeholder.svg', () => ({
  default: {
    name: 'IconImagePlaceholder',
    template: '<svg data-testid="image-placeholder-icon" />',
  },
}))

const defaultProps = {
  alt: 'Test thumbnail',
  src: '/product-1-big.avif',
  srcSet: '/product-1-big.avif',
  sizes: '96px',
}

describe('SFProductThumbnail', () => {
  it('builds src/srcSet/sizes from url and preset, ignoring the string props', () => {
    const url = 'https://cdn.example.com/images/product-1.avif'
    const wrapper = mount(SFProductThumbnail, {
      props: { ...defaultProps, url, preset: 'thumbnail' },
    })

    const variant = buildImageVariant(url, IMAGE_VARIANTS.thumbnail)
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe(variant.src)
    expect(img.attributes('srcset')).toBe(variant.srcSet)
    expect(img.attributes('sizes')).toBe(variant.sizes)
  })

  it('falls back to the explicit src/srcSet/sizes props without url', () => {
    const wrapper = mount(SFProductThumbnail, { props: defaultProps })

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe(defaultProps.src)
    expect(img.attributes('srcset')).toBe(defaultProps.srcSet)
    expect(img.attributes('sizes')).toBe(defaultProps.sizes)
  })

  it('renders diagonal strikethrough when disabled', () => {
    const wrapper = mount(SFProductThumbnail, {
      props: {
        ...defaultProps,
        disabled: true,
      },
    })

    expect(
      wrapper.find('[data-testid="product-thumbnail-strikethrough"]').exists(),
    ).toBe(true)
  })

  it('marks the selected thumbnail with the primary border', () => {
    const wrapper = mount(SFProductThumbnail, {
      props: {
        ...defaultProps,
        thumbnailSize: ThumbnailSize.MD,
        selected: true,
      },
    })

    expect(
      wrapper.find('[data-testid="product-thumbnail"]').classes(),
    ).toContain('border-primary')
  })

  it('leaves an unselected thumbnail without the selected border', () => {
    const wrapper = mount(SFProductThumbnail, {
      props: {
        ...defaultProps,
        thumbnailSize: ThumbnailSize.MD,
        selected: false,
      },
    })

    expect(
      wrapper.find('[data-testid="product-thumbnail"]').classes(),
    ).not.toContain('border-primary')
  })

  // The wrapper pins the compact step, so no preset can end up on the default one.
  it('pads the frame with the compact step when the image asks for padding', () => {
    const wrapper = mount(SFProductThumbnail, {
      props: { ...defaultProps, applyPadding: true },
    })

    const classes = wrapper.find('[data-testid="product-thumbnail"]').classes()
    expect(classes).toContain('p-1')
    expect(classes).not.toContain('p-4')
  })
})
