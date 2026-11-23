import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { t } from '@test/mocks/vue-i18n'
import type { ImageSliderImage } from '@client/utils/constants'
import SFImageGallery from './SFImageGallery.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const images: ImageSliderImage[] = [
  { url: 'a.jpg', preset: 'detail', alt: 'Image A', hash: 'a' },
  { url: 'b.jpg', preset: 'detail', alt: 'Image B', hash: 'b' },
  { url: 'c.jpg', preset: 'detail', alt: 'Image C', hash: 'c' },
]

const productImageStub = {
  props: [
    'url',
    'preset',
    'alt',
    'imageLoading',
    'fetchPriority',
    'applyPadding',
  ],
  template:
    '<img data-testid="product-image" :data-url="url" :data-preset="preset" :alt="alt">',
}

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SFImageGallery, {
    props: { images, ...props },
    global: {
      mocks: { $t: t },
      stubs: { SFProductImage: productImageStub },
    },
  })

describe('SFImageGallery image url/preset contract', () => {
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

describe('SFImageGallery', () => {
  it('renders a labelled carousel region', () => {
    const wrapper = mountComponent()
    const region = wrapper.get('[data-testid="image-gallery"]')
    expect(region.attributes('aria-roledescription')).toBe('carousel')
    expect(region.attributes('aria-label')).toBe(
      'image_slider.a11ly.carousel_label',
    )
  })

  it('makes the scrolling element the only Tab stop', () => {
    const wrapper = mountComponent()
    const carousel = wrapper.get('[data-testid="image-gallery"]')
    expect(carousel.attributes('tabindex')).toBe('0')
    expect(carousel.attributes('role')).toBe('group')
    expect(carousel.classes()).toContain('overflow-x-auto')
    // Arrow buttons are `tabindex="-1"`, so only the scroller takes the Tab stop
    // ahead of the roving dot.
    expect(
      wrapper
        .find('[data-testid="image-gallery-prev-button"]')
        .attributes('tabindex'),
    ).toBe('-1')
  })

  it('marks each slide with the carousel slide ARIA pattern', () => {
    const wrapper = mountComponent()
    const slide = wrapper.get('[data-testid="image-gallery-slide-0"]')
    expect(slide.attributes('role')).toBe('group')
    expect(slide.attributes('aria-roledescription')).toBe('slide')
    expect(slide.attributes('aria-label')).toBe(
      'image_slider.a11ly.image_position({"current":1,"total":3})',
    )
  })

  it('marks every slide except the active one as inert', () => {
    const wrapper = mountComponent()
    // activeSlide starts at 0
    expect(
      wrapper.get('[data-testid="image-gallery-slide-0"]').attributes('inert'),
    ).toBeUndefined()
    expect(
      wrapper.get('[data-testid="image-gallery-slide-1"]').attributes('inert'),
    ).toBe('')
    expect(
      wrapper.get('[data-testid="image-gallery-slide-2"]').attributes('inert'),
    ).toBe('')
  })

  it('renders skeleton placeholders when loading', () => {
    const wrapper = mountComponent({ isLoading: true })
    expect(
      wrapper.findAll('[data-testid="image-gallery-skeleton"]'),
    ).toHaveLength(images.length)
    expect(wrapper.find('[data-testid="product-image"]').exists()).toBe(false)
  })

  it('renders dots by default and hides them when withDots is false', () => {
    expect(
      mountComponent().find('[data-testid="image-slider-dots"]').exists(),
    ).toBe(true)
    expect(
      mountComponent({ withDots: false })
        .find('[data-testid="image-slider-dots"]')
        .exists(),
    ).toBe(false)
  })

  it('renders prev/next buttons when there is more than one image', () => {
    const many = mountComponent()
    expect(
      many.find('[data-testid="image-gallery-prev-button"]').exists(),
    ).toBe(true)
    expect(
      many.find('[data-testid="image-gallery-next-button"]').exists(),
    ).toBe(true)
  })

  it('hides both arrows and the dots for a single image', () => {
    const single = mountComponent({ images: [images[0]] })

    expect(
      single.find('[data-testid="image-gallery-prev-button"]').exists(),
    ).toBe(false)
    expect(
      single.find('[data-testid="image-gallery-next-button"]').exists(),
    ).toBe(false)
    expect(single.find('[data-testid="image-slider-dots"]').exists()).toBe(
      false,
    )
  })

  it('labels the prev/next arrows with the image slider translations', () => {
    const wrapper = mountComponent()
    expect(
      wrapper
        .get('[data-testid="image-gallery-prev-button"]')
        .attributes('aria-label'),
    ).toBe('image_slider.a11ly.go_to_previous_image')
    expect(
      wrapper
        .get('[data-testid="image-gallery-next-button"]')
        .attributes('aria-label'),
    ).toBe('image_slider.a11ly.go_to_next_image')
  })

  it('points the arrows at the slides container via aria-controls', () => {
    const wrapper = mountComponent()
    const controls = wrapper
      .get('[data-testid="image-gallery-prev-button"]')
      .attributes('aria-controls')

    expect(
      wrapper
        .get(`[id="${controls}"]`)
        .find('[data-testid="image-gallery-slide-0"]')
        .exists(),
    ).toBe(true)
  })

  // The zoom modal renders the gallery in the full viewport layout.
  it('moves to the next image with the next arrow in the full viewport layout', async () => {
    const wrapper = mountComponent({ fullViewport: true })

    await wrapper
      .get('[data-testid="image-gallery-next-button"]')
      .trigger('click')

    expect(wrapper.emitted('update:activeSlide')).toStrictEqual([[1]])
  })

  it('emits slideClick when a default slide image is clicked', async () => {
    const wrapper = mountComponent()
    await wrapper
      .get(
        '[data-testid="image-gallery-slide-0"] [data-testid="product-image"]',
      )
      .trigger('click')
    expect(wrapper.emitted('slideClick')).toStrictEqual([[0]])
  })

  it('emits slideClick for the active slide on Enter/Space when the region is focused', async () => {
    const wrapper = mountComponent()
    const region = wrapper.get('[data-testid="image-gallery"]')
    await region.trigger('keydown', { key: 'Enter' })
    await region.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('slideClick')).toStrictEqual([[0], [0]])
  })

  it('moves to the next slide on ArrowRight', async () => {
    const wrapper = mountComponent()
    await wrapper
      .get('[data-testid="image-gallery"]')
      .trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(wrapper.emitted('update:activeSlide')).toStrictEqual([[1]])
  })

  it('moves to the last slide on End', async () => {
    const wrapper = mountComponent()
    await wrapper
      .get('[data-testid="image-gallery"]')
      .trigger('keydown', { key: 'End' })
    await nextTick()
    expect(wrapper.emitted('update:activeSlide')).toStrictEqual([[2]])
  })

  it('moves back to the first slide on Home', async () => {
    const wrapper = mountComponent()
    const carousel = wrapper.get('[data-testid="image-gallery"]')
    await carousel.trigger('keydown', { key: 'End' })
    await nextTick()
    await carousel.trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(wrapper.emitted('update:activeSlide')).toStrictEqual([[2], [0]])
  })

  it('does NOT emit slideClick when Enter bubbles up from a child of the carousel', async () => {
    const wrapper = mountComponent()
    // Keydown originates on a slide inside the scroller, not on the scroller itself.
    await wrapper
      .get('[data-testid="image-gallery-slide-0"]')
      .trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('slideClick')).toBeUndefined()
  })

  it('marks the target slide active immediately on scrollImageIntoView (no inert window)', async () => {
    const wrapper = mountComponent()
    wrapper.vm.scrollImageIntoView(2)
    await nextTick()
    expect(
      wrapper.get('[data-testid="image-gallery-slide-2"]').attributes('inert'),
    ).toBeUndefined()
    expect(
      wrapper.get('[data-testid="image-gallery-slide-0"]').attributes('inert'),
    ).toBe('')
  })

  it('announces the position of the image that becomes active', async () => {
    const wrapper = mountComponent()

    wrapper.vm.scrollImageIntoView(1)
    await nextTick()

    const live = wrapper.get('[data-testid="image-gallery-live-region"]')
    expect(live.attributes('aria-live')).toBe('polite')
    expect(live.text()).toBe(
      'image_slider.a11ly.image_position({"current":2,"total":3})',
    )
  })
})
