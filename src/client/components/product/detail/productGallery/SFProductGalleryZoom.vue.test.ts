import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '@test/mocks/vue-i18n'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import type { ProductGalleryItem } from '@shared/utils/productGalleryMedia'
import SFProductGalleryZoom from './SFProductGalleryZoom.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const toggleDoubleZoom = vi.hoisted(() => vi.fn())

vi.mock('@client/composables/useGalleryZoom', () => ({
  useGalleryZoom: () => ({
    scale: ref(1),
    toggleDoubleZoom,
    updateZoomOffset: vi.fn(),
    isTouchSupported: ref(false),
    zoomOffsetX: ref(0),
    zoomOffsetY: ref(0),
  }),
}))

const images: ProductGalleryItem[] = [
  {
    type: 'image',
    url: 'https://cdn.example.com/img-1.avif',
    applyPadding: false,
  },
  {
    type: 'image',
    url: 'https://cdn.example.com/img-2.avif',
    applyPadding: true,
  },
]

const mixed: ProductGalleryItem[] = [
  { type: 'image', url: 'https://cdn.example.com/img-1.avif' },
  {
    type: 'video',
    url: 'https://cdn.example.com/hero.mp4',
    posterUrl: 'https://cdn.example.com/hero.jpg',
  },
  {
    type: 'image',
    url: 'https://cdn.example.com/img-2.avif',
    applyPadding: true,
  },
]

const stubs = {
  SFModal: { template: '<div><slot /></div>' },
  SFSliderArrowButton: defineComponent({
    name: 'SFSliderArrowButton',
    props: ['direction', 'disabled', 'accessibleLabel', 'controls'],
    emits: ['click'],
    // Like the real button, it stays clickable when disabled and leaves the
    // boundary check to the slider.
    template:
      '<button :aria-label="accessibleLabel" :aria-controls="controls" :aria-disabled="disabled" @click="$emit(\'click\')"></button>',
  }),
  SFProductImage: defineComponent({
    name: 'SFProductImage',
    inheritAttrs: false,
    props: ['url', 'preset', 'alt', 'applyPadding'],
    template:
      '<img data-testid="zoom-image" :data-url="url" :data-preset="preset" :alt="alt" :data-apply-padding="applyPadding">',
  }),
  SFProductVideoSlide: defineComponent({
    name: 'SFProductVideoSlide',
    props: ['url', 'posterUrl', 'alt', 'isPlaying'],
    template:
      '<div data-testid="zoom-video" :data-url="url" :data-poster="posterUrl" :data-playing="String(isPlaying)"></div>',
  }),
}

/**
 * The real `SFModal` renders its slot inside `ClientOnly`, so the slider element
 * appears a tick after this component mounts. Tests about opening position use
 * the real `ClientOnly` here rather than the flat stub above, so they mount the
 * component the way production does and assert that the opening scroll lands on
 * the clicked slide once the element exists. They check that the scroll happens,
 * not when it is scheduled.
 */
const deferredStubs = {
  ...stubs,
  SFModal: defineComponent({
    name: 'SFModal',
    components: { ClientOnly },
    template: '<ClientOnly><div><slot /></div></ClientOnly>',
  }),
}

describe('SFProductGalleryZoom image url/preset contract', () => {
  it('passes each image with the zoom preset instead of its grid tile preset', () => {
    const wrapper = mount(SFProductGalleryZoom, {
      props: { alt: 'Product Name', items: images, visible: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

    const zoomImgs = wrapper.findAll('[data-testid="zoom-image"]')
    expect(zoomImgs).toHaveLength(images.length)

    for (const [index, img] of zoomImgs.entries()) {
      expect(img.attributes('data-url')).toBe(images[index]!.url)
      expect(img.attributes('data-preset')).toBe('galleryZoom')
    }
  })

  it('forwards applyPadding from the source images', () => {
    const wrapper = mount(SFProductGalleryZoom, {
      props: { alt: 'Product Name', items: images, visible: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

    const zoomImgs = wrapper.findAll('[data-testid="zoom-image"]')
    expect(zoomImgs[0]!.attributes('data-apply-padding')).toBe('false')
    expect(zoomImgs[1]!.attributes('data-apply-padding')).toBe('true')
  })
})

describe('SFProductGalleryZoom slide markup', () => {
  it('makes the scrolling element the only Tab stop', () => {
    const wrapper = mount(SFProductGalleryZoom, {
      props: { alt: 'Product Name', items: mixed, visible: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

    const carousel = wrapper.get('[data-testid="zoom-gallery"]')
    expect(carousel.attributes('tabindex')).toBe('0')
    expect(carousel.attributes('role')).toBe('group')
    expect(carousel.attributes('aria-roledescription')).toBe('carousel')
    expect(carousel.classes()).toContain('overflow-x-auto')
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
  })

  it('renders the slides as groups inside a plain container, not as list items', () => {
    const wrapper = mount(SFProductGalleryZoom, {
      props: { alt: 'Product Name', items: mixed, visible: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

    const slide = wrapper.get('[data-testid="zoom-gallery-slide-0"]')
    expect(slide.element.tagName).toBe('DIV')
    expect(slide.attributes('role')).toBe('group')
    expect(wrapper.find('ul').exists()).toBe(false)
    expect(wrapper.find('li').exists()).toBe(false)
  })
})

describe('SFProductGalleryZoom mixed media', () => {
  it('renders image and video slides in gallery order', () => {
    const wrapper = mount(SFProductGalleryZoom, {
      props: { alt: 'Product Name', items: mixed, visible: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

    const zoomImgs = wrapper.findAll('[data-testid="zoom-image"]')
    expect(zoomImgs.map((img) => img.attributes('data-url'))).toEqual([
      mixed[0]!.url,
      mixed[2]!.url,
    ])

    const video = wrapper.find('[data-testid="zoom-video"]')
    expect(video.attributes('data-url')).toBe(
      'https://cdn.example.com/hero.mp4',
    )
    expect(video.attributes('data-poster')).toBe(
      'https://cdn.example.com/hero.jpg',
    )
  })

  it('plays the video only when the modal is visible and that slide is current', async () => {
    const wrapper = mount(SFProductGalleryZoom, {
      props: {
        alt: 'Product Name',
        items: mixed,
        visible: true,
        currentSlideIndex: 0,
      },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

    expect(
      wrapper.find('[data-testid="zoom-video"]').attributes('data-playing'),
    ).toBe('false')

    await wrapper.setProps({ currentSlideIndex: 1 })
    expect(
      wrapper.find('[data-testid="zoom-video"]').attributes('data-playing'),
    ).toBe('true')

    await wrapper.setProps({ visible: false })
    expect(
      wrapper.find('[data-testid="zoom-video"]').attributes('data-playing'),
    ).toBe('false')
  })
})

describe('SFProductGalleryZoom initial slide', () => {
  const openAt = (currentSlideIndex?: number) =>
    mount(SFProductGalleryZoom, {
      props: {
        alt: 'Product Name',
        items: mixed,
        visible: true,
        ...(currentSlideIndex === undefined ? {} : { currentSlideIndex }),
      },
      global: { stubs: deferredStubs, mocks: { $t: (k: string) => k } },
    })

  it('opens on the slide it was created with, not the first one', async () => {
    const wrapper = openAt(2)
    await flushPromises()

    expect(
      wrapper.find('[data-testid="zoom-gallery-slide-2"]').attributes('inert'),
    ).toBeUndefined()
    expect(
      wrapper.find('[data-testid="zoom-gallery-slide-0"]').attributes('inert'),
    ).toBeDefined()
  })

  it('scrolls to that slide once the slider element exists', async () => {
    const scrollTo = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(scrollTo)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(500)

    openAt(2)
    await flushPromises()

    expect(scrollTo).toHaveBeenCalledWith({ left: 1000, behavior: 'instant' })
  })

  it('still opens on the first slide when no index is given', async () => {
    const wrapper = openAt()
    await flushPromises()

    expect(
      wrapper.find('[data-testid="zoom-gallery-slide-0"]').attributes('inert'),
    ).toBeUndefined()
  })
})

describe('SFProductGalleryZoom footer navigation', () => {
  const SLIDE_WIDTH = 500

  const openAt = async (currentSlideIndex: number) => {
    const wrapper = mount(SFProductGalleryZoom, {
      props: {
        alt: 'Product Name',
        items: mixed,
        visible: true,
        currentSlideIndex,
      },
      global: { stubs, mocks: { $t: t } },
    })
    // The arrows only enable once the slider has mounted.
    await flushPromises()
    return wrapper
  }

  const previousButton = (wrapper: VueWrapper) =>
    wrapper.get('[data-testid="zoom-gallery-prev-button"]')
  const nextButton = (wrapper: VueWrapper) =>
    wrapper.get('[data-testid="zoom-gallery-next-button"]')

  /** Returns the index of the one slide that is not inert. */
  const activeSlide = (wrapper: VueWrapper) =>
    wrapper
      .findAll('[data-testid^="zoom-gallery-slide-"]')
      .findIndex((slide) => slide.attributes('inert') === undefined)

  // happy-dom has no layout and never fires `scroll`. This gives the slider
  // three 500px slides and fires the scroll event a browser fires when the
  // slider comes to rest on a slide, which is what updates the arrow states.
  const restSliderOn = async (wrapper: VueWrapper, slideIndex: number) => {
    const sliderId = nextButton(wrapper).attributes('aria-controls')
    const slider = wrapper.get(`[id="${sliderId}"]`)
    Object.defineProperties(slider.element, {
      clientWidth: { value: SLIDE_WIDTH },
      scrollWidth: { value: SLIDE_WIDTH * mixed.length },
    })
    slider.element.scrollLeft = SLIDE_WIDTH * slideIndex
    await slider.trigger('scroll')
  }

  it('disables previous and enables next on the first slide', async () => {
    const wrapper = await openAt(0)

    expect(previousButton(wrapper).attributes('aria-disabled')).toBe('true')
    expect(nextButton(wrapper).attributes('aria-disabled')).toBe('false')
  })

  it('shows the next slide and its position when next is clicked', async () => {
    const wrapper = await openAt(0)

    await nextButton(wrapper).trigger('click')

    expect(activeSlide(wrapper)).toBe(1)
    expect(wrapper.get('[data-testid="zoom-gallery-footer"]').text()).toContain(
      'product_image.a11y.slide_position({"current":2,"total":3})',
    )
    expect(wrapper.emitted('update:slide')).toEqual([[1]])
  })

  it('shows the previous slide when previous is clicked', async () => {
    const wrapper = await openAt(1)
    await restSliderOn(wrapper, 1)

    await previousButton(wrapper).trigger('click')

    expect(activeSlide(wrapper)).toBe(0)
    expect(wrapper.emitted('update:slide')).toEqual([[0]])
  })

  it('disables next and enables previous on the last slide', async () => {
    const wrapper = await openAt(2)
    await restSliderOn(wrapper, 2)

    expect(nextButton(wrapper).attributes('aria-disabled')).toBe('true')
    expect(previousButton(wrapper).attributes('aria-disabled')).toBe('false')
  })

  it('stays on the last slide when next is clicked there', async () => {
    const wrapper = await openAt(2)
    await restSliderOn(wrapper, 2)

    await nextButton(wrapper).trigger('click')

    expect(activeSlide(wrapper)).toBe(2)
    expect(wrapper.emitted('update:slide')).toBeUndefined()
  })

  it('stays on the first slide when previous is clicked there', async () => {
    const wrapper = await openAt(0)

    await previousButton(wrapper).trigger('click')

    expect(activeSlide(wrapper)).toBe(0)
    expect(wrapper.emitted('update:slide')).toBeUndefined()
  })

  it('hides the footer when there is only one item', () => {
    const wrapper = mount(SFProductGalleryZoom, {
      props: {
        alt: 'Product Name',
        items: [images[0]!],
        visible: true,
      },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

    expect(wrapper.find('[data-testid="zoom-gallery-footer"]').exists()).toBe(
      false,
    )
  })
})

describe('SFProductGalleryZoom keyboard', () => {
  const mountZoom = () =>
    mount(SFProductGalleryZoom, {
      props: { alt: 'Product Name', items: mixed, visible: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

  beforeEach(() => {
    toggleDoubleZoom.mockClear()
  })

  it('moves to the next slide on ArrowRight', async () => {
    const wrapper = mountZoom()
    await wrapper
      .get('[data-testid="zoom-gallery"]')
      .trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(wrapper.emitted('update:slide')).toStrictEqual([[1]])
  })

  it('moves to the last slide on End', async () => {
    const wrapper = mountZoom()
    await wrapper
      .get('[data-testid="zoom-gallery"]')
      .trigger('keydown', { key: 'End' })
    await nextTick()
    expect(wrapper.emitted('update:slide')).toStrictEqual([[2]])
  })

  it('moves back to the first slide on Home', async () => {
    const wrapper = mountZoom()
    const carousel = wrapper.get('[data-testid="zoom-gallery"]')
    await carousel.trigger('keydown', { key: 'End' })
    await nextTick()
    await carousel.trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(wrapper.emitted('update:slide')).toStrictEqual([[2], [0]])
  })

  it('toggles the zoom on Enter when the carousel is focused', async () => {
    const wrapper = mountZoom()
    await wrapper
      .get('[data-testid="zoom-gallery"]')
      .trigger('keydown', { key: 'Enter' })
    expect(toggleDoubleZoom).toHaveBeenCalledOnce()
  })

  it('does not toggle the zoom when Enter comes from content inside a slide', async () => {
    const wrapper = mountZoom()
    await wrapper
      .get('[data-testid="zoom-gallery-slide-0"]')
      .trigger('keydown', { key: 'Enter' })
    expect(toggleDoubleZoom).not.toHaveBeenCalled()
  })
})
