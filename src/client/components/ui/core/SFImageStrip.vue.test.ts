import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ImageSliderImage } from '@client/utils/constants'
import SFImageStrip from './SFImageStrip.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const images: ImageSliderImage[] = [
  { url: 'a.jpg', preset: 'tile', alt: 'Image A (1/3)', hash: 'a' },
  { url: 'b.jpg', preset: 'tile', alt: 'Image B (2/3)', hash: 'b' },
  { url: 'c.jpg', preset: 'tile', alt: 'Image C (3/3)', hash: 'c' },
]

const productImageStub = {
  props: ['url', 'preset', 'alt', 'imageLoading', 'fetchPriority'],
  template:
    '<img data-testid="product-image" :data-url="url" :data-preset="preset" :alt="alt">',
}

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SFImageStrip, {
    props: { images, ...props },
    global: {
      mocks: { $t: (key: string) => key },
      stubs: { SFProductImage: productImageStub },
    },
  })

describe('SFImageStrip image url/preset contract', () => {
  it('forwards url and preset from each slide to SFProductImage', () => {
    const wrapper = mountComponent()

    const renderedImages = wrapper.findAll('[data-testid="product-image"]')
    expect(renderedImages).toHaveLength(images.length)

    for (const [index, img] of renderedImages.entries()) {
      expect(img.attributes('data-url')).toBe(images[index]!.url)
      expect(img.attributes('data-preset')).toBe(images[index]!.preset)
    }
  })
})

describe('SFImageStrip', () => {
  it('renders a labelled list with one item per image', () => {
    const wrapper = mountComponent({ ariaLabel: 'Sneaker images' })
    const region = wrapper.get('[data-testid="image-strip"]')
    expect(region.element.tagName).toBe('DIV')
    expect(region.attributes('role')).toBe('group')
    expect(region.attributes('aria-label')).toBe('Sneaker images')
    expect(wrapper.findAll('li')).toHaveLength(images.length)
  })

  it('makes no carousel claim: no slide semantics and no live region', () => {
    const wrapper = mountComponent()

    expect(wrapper.findAll('[aria-roledescription]')).toHaveLength(0)
    expect(
      wrapper.get('[data-testid="image-strip-slide-0"]').attributes('role'),
    ).toBeUndefined()
    expect(wrapper.findAll('[aria-live]')).toHaveLength(0)
  })

  it('hides arrows by default and shows them when withArrows is set', () => {
    expect(
      mountComponent().find('[data-testid="image-strip-prev-button"]').exists(),
    ).toBe(false)

    const withArrows = mountComponent({ withArrows: true })
    expect(
      withArrows.find('[data-testid="image-strip-prev-button"]').exists(),
    ).toBe(true)
    expect(
      withArrows.find('[data-testid="image-strip-next-button"]').exists(),
    ).toBe(true)
  })

  it('arrows make no carousel claim (no aria-controls)', () => {
    const prev = mountComponent({ withArrows: true }).get(
      '[data-testid="image-strip-prev-button"]',
    )
    expect(prev.attributes('aria-controls')).toBeUndefined()
  })

  it('labels the prev/next arrows with the image slider translations', () => {
    const wrapper = mountComponent({ withArrows: true })
    expect(
      wrapper
        .get('[data-testid="image-strip-prev-button"]')
        .attributes('aria-label'),
    ).toBe('image_slider.a11ly.go_to_previous_image')
    expect(
      wrapper
        .get('[data-testid="image-strip-next-button"]')
        .attributes('aria-label'),
    ).toBe('image_slider.a11ly.go_to_next_image')
  })

  it.for([
    {
      case: 'hides the arrows until hover by default',
      forceArrowsVisible: false,
      invisible: true,
    },
    {
      case: 'shows the arrows without hover when forceArrowsVisible is set',
      forceArrowsVisible: true,
      invisible: false,
    },
  ])('$case', ({ forceArrowsVisible, invisible }) => {
    const container = mountComponent({
      withArrows: true,
      forceArrowsVisible,
    }).get('[data-testid="image-strip-prev-button"]').element.parentElement

    expect(container?.classList.contains('invisible')).toBe(invisible)
  })

  it('emits slideClick when a default image is clicked', async () => {
    const wrapper = mountComponent()
    await wrapper
      .get('[data-testid="image-strip-slide-1"] [data-testid="product-image"]')
      .trigger('click')
    expect(wrapper.emitted('slideClick')).toStrictEqual([[1]])
  })
})
