import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ImageComponent as ImageComponentType } from '@shared/types/cms/amplience'
import ImageComponent from './ImageComponent.vue'

let lcpIndex = -1
vi.mock('@client/cms/shared/useLcpPriority', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@client/cms/shared/useLcpPriority')
  >()),
  useLcpPriority: () => ({ claim: () => lcpIndex }),
}))

const desktopImage = {
  id: 'a',
  name: 'hero-desktop',
  endpoint: 'scayle',
  defaultHost: 'cdn.media.amplience.net',
}

const mobileImage = {
  id: 'b',
  name: 'hero-mobile',
  endpoint: 'scayle',
  defaultHost: 'cdn.media.amplience.net',
}

const contentElement = {
  _meta: { schema: 'x', deliveryId: 'img-1' },
  alt_text: 'Hero',
  image_desktop: desktopImage,
} as unknown as ImageComponentType

const mountImage = (element: ImageComponentType = contentElement) =>
  mount(ImageComponent, { props: { contentElement: element } })

afterEach(() => {
  lcpIndex = -1
})

describe('Amplience ImageComponent', () => {
  it('renders the alt text from the Amplience field', () => {
    expect(mountImage().find('img').attributes('alt')).toBe('Hero')
  })

  it('builds Dynamic Media sources for each format', () => {
    const sources = mountImage().findAll('source')
    const types = sources.map((source) => source.attributes('type'))

    expect(types).toContain('image/avif')
    expect(types).toContain('image/webp')
    expect(types).toContain('image/jpeg')
    expect(sources[0]?.attributes('srcset')).toContain(
      'cdn.media.amplience.net/i/scayle/hero-desktop',
    )
  })

  it('falls back to the desktop image on mobile when no mobile image is set', () => {
    const mobileSources = mountImage()
      .findAll('source')
      .filter((source) => source.attributes('media') === '(width < 64rem)')

    expect(mobileSources.length).toBeGreaterThan(0)
    expect(mobileSources[0]?.attributes('srcset')).toContain('hero-desktop')
  })

  it('uses the dedicated mobile image when the author provided one', () => {
    const mobileSources = mountImage({
      ...contentElement,
      image_mobile: mobileImage,
    } as unknown as ImageComponentType)
      .findAll('source')
      .filter((source) => source.attributes('media') === '(width < 64rem)')

    expect(mobileSources[0]?.attributes('srcset')).toContain('hero-mobile')
  })

  it.each([
    { ratio: '16:9', expected: '16/9' },
    { ratio: '1:1', expected: '1/1' },
    { ratio: '4:3', expected: '4/3' },
    { ratio: '3:4', expected: '3/4' },
  ])('maps the $ratio aspect ratio to $expected', ({ ratio, expected }) => {
    const wrapper = mountImage({
      ...contentElement,
      aspect_ratio_desktop: ratio,
    } as unknown as ImageComponentType)

    expect(wrapper.attributes('style')).toContain(
      `--desktop-aspect-ratio: ${expected}`,
    )
  })

  it('leaves the ratio to the loaded image for original, which Amplience does not expose dimensions for', () => {
    const wrapper = mountImage({
      ...contentElement,
      aspect_ratio_desktop: 'original',
    } as unknown as ImageComponentType)

    expect(wrapper.attributes('style')).toContain(
      '--desktop-aspect-ratio: auto',
    )
  })

  // The index-to-priority table is tested in shared/useLcpPriority.vue.test.ts;
  // this only proves the image applies the priority its claim resolves to.
  it('renders the first claimed image at high priority and loads it eagerly', () => {
    lcpIndex = 0
    const img = mountImage().find('img')

    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('annotates the entry so the Amplience editor can highlight the field', () => {
    const wrapper = mountImage()

    expect(wrapper.attributes('data-amplience-entry-id')).toBe('img-1')
    expect(wrapper.attributes('data-amplience-field-id')).toBe('image_desktop')
  })
})
