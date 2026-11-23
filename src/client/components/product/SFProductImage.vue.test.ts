import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { PRODUCT_IMAGE_ASPECT_RATIO } from '@client/constants'
import { ProductImageForcedState } from '@client/utils/constants'
import SFProductImage from './SFProductImage.vue'

vi.mock('@assets/icons/utility/image-placeholder.svg', () => ({
  default: {
    name: 'IconImagePlaceholder',
    template: '<svg data-testid="image-placeholder-icon" />',
  },
}))

const initialRenderMock = vi.fn(() => true)

vi.mock('@client/utils/initialRender', () => ({
  get isInitialRender() {
    return initialRenderMock
  },
  markNavigated: vi.fn(),
}))

const defaultProps = {
  alt: 'Test product',
  src: '/product-1-big.avif',
  srcSet: '/product-1-big.avif',
  sizes: '100vw',
}

const productImg = (wrapper: ReturnType<typeof mount>) => wrapper.find('img')

describe('SFProductImage', () => {
  it('renders skeleton while the image is loading', () => {
    initialRenderMock.mockReturnValue(false)

    const wrapper = mount(SFProductImage, {
      props: defaultProps,
    })

    expect(
      wrapper.find('[data-testid="product-image-skeleton"]').exists(),
    ).toBe(true)
    expect(productImg(wrapper).attributes('aria-hidden')).toBe('true')

    initialRenderMock.mockReturnValue(true)
  })

  it('renders the image after load and hides the skeleton', async () => {
    const wrapper = mount(SFProductImage, {
      props: defaultProps,
    })

    await productImg(wrapper).trigger('load')

    expect(
      wrapper.find('[data-testid="product-image-skeleton"]').exists(),
    ).toBe(false)
    expect(productImg(wrapper).attributes('alt')).toBe('Test product')
    expect(productImg(wrapper).attributes('aria-hidden')).toBe('false')
  })

  it('renders error placeholder when the image fails to load', async () => {
    const wrapper = mount(SFProductImage, {
      props: defaultProps,
    })

    await productImg(wrapper).trigger('error')

    expect(wrapper.find('[data-testid="product-image-error"]').exists()).toBe(
      true,
    )
    expect(productImg(wrapper).exists()).toBe(false)
  })

  it('renders error placeholder when the image already failed before sync', async () => {
    const wrapper = mount(SFProductImage, {
      props: defaultProps,
    })

    const img = productImg(wrapper).element as HTMLImageElement
    Object.defineProperty(img, 'complete', { value: true, configurable: true })
    Object.defineProperty(img, 'naturalWidth', {
      value: 0,
      configurable: true,
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="product-image-error"]').exists()).toBe(
      true,
    )
    expect(
      wrapper.find('[data-testid="product-image-skeleton"]').exists(),
    ).toBe(false)
  })

  it('renders error placeholder when src is missing', () => {
    const wrapper = mount(SFProductImage, {
      props: {
        alt: 'Missing image',
      },
    })

    expect(wrapper.find('[data-testid="product-image-error"]').exists()).toBe(
      true,
    )
  })

  it('frames the image at the product image aspect ratio', () => {
    const wrapper = mount(SFProductImage, { props: defaultProps })

    expect(
      wrapper.get('[data-testid="product-image"]').attributes('style'),
    ).toContain(
      `aspect-ratio: ${PRODUCT_IMAGE_ASPECT_RATIO[0]} / ${PRODUCT_IMAGE_ASPECT_RATIO[1]}`,
    )
  })

  it('shows the whole image without cropping by default', () => {
    const wrapper = mount(SFProductImage, { props: defaultProps })

    expect(productImg(wrapper).classes()).toContain('object-contain')
  })

  it('forces skeleton state for Storybook', () => {
    const wrapper = mount(SFProductImage, {
      props: {
        ...defaultProps,
        forceState: ProductImageForcedState.SKELETON,
      },
    })

    expect(
      wrapper.find('[data-testid="product-image-skeleton"]').exists(),
    ).toBe(true)
    expect(productImg(wrapper).exists()).toBe(false)
  })

  it('loads lazily when no imageLoading prop is passed', () => {
    const wrapper = mount(SFProductImage, { props: defaultProps })

    expect(productImg(wrapper).attributes('loading')).toBe('lazy')
  })

  it('forwards an explicit eager imageLoading to the img', () => {
    const wrapper = mount(SFProductImage, {
      props: { ...defaultProps, imageLoading: 'eager' },
    })

    expect(productImg(wrapper).attributes('loading')).toBe('eager')
  })
})
