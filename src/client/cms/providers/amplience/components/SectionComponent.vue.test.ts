import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import type { SectionComponent as SectionComponentType } from '@shared/types/cms/amplience'
import SectionComponent from './SectionComponent.vue'

const backgroundImage = {
  id: 'a',
  name: 'bg-desktop',
  endpoint: 'scayle',
  defaultHost: 'cdn.media.amplience.net',
}

const mobileBackgroundImage = {
  ...backgroundImage,
  name: 'bg-mobile',
}

const section = (overrides: Partial<SectionComponentType> = {}) =>
  ({
    _meta: { schema: 'x', deliveryId: 'section-1' },
    content: [],
    ...overrides,
  }) as unknown as SectionComponentType

const mountSection = (element: SectionComponentType) =>
  mount(SectionComponent, { props: { contentElement: element } })

/** Mounts sections in document order under one page-level LCP claim. */
const mountSectionsOnPage = (elements: SectionComponentType[]) =>
  mount(
    defineComponent({
      setup() {
        provideLcpPriority()
        return () =>
          elements.map((contentElement) =>
            h(SectionComponent, { contentElement }),
          )
      },
    }),
  )

describe('Amplience SectionComponent', () => {
  it('renders no background picture when the author set no image', () => {
    expect(mountSection(section()).find('picture').exists()).toBe(false)
  })

  it('renders a background picture from the desktop image', () => {
    const wrapper = mountSection(
      section({ background_image_desktop: backgroundImage } as never),
    )

    expect(wrapper.find('picture').exists()).toBe(true)
    expect(wrapper.find('img').attributes('src')).toContain(
      'cdn.media.amplience.net/i/scayle/bg-desktop',
    )
  })

  it('falls back to the desktop background on mobile', () => {
    const mobileSources = mountSection(
      section({ background_image_desktop: backgroundImage } as never),
    )
      .findAll('source')
      .filter((source) => source.attributes('media') === '(width < 64rem)')

    expect(mobileSources[0]?.attributes('srcset')).toContain('bg-desktop')
  })

  it('uses the dedicated mobile background when provided', () => {
    const mobileSources = mountSection(
      section({
        background_image_desktop: backgroundImage,
        background_image_mobile: mobileBackgroundImage,
      } as never),
    )
      .findAll('source')
      .filter((source) => source.attributes('media') === '(width < 64rem)')

    expect(mobileSources[0]?.attributes('srcset')).toContain('bg-mobile')
  })

  it('leaves the high-priority position to a later background when it has none', () => {
    const images = mountSectionsOnPage([
      section(),
      section({ background_image_desktop: backgroundImage } as never),
    ]).findAll('img')

    expect(images).toHaveLength(1)
    expect(images[0]!.attributes('fetchpriority')).toBe('high')
  })

  it('marks a first-position background as the high-priority LCP candidate', () => {
    const img = mountSectionsOnPage([
      section({ background_image_desktop: backgroundImage } as never),
    ]).get('img')

    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('applies the authored background color', () => {
    const wrapper = mountSection(
      section({ background_color: '#ff0000' } as never),
    )

    expect(wrapper.attributes('style')).toContain('background-color: #ff0000')
  })

  it('applies min heights from the snake_case Amplience fields', () => {
    const style = mountSection(
      section({ min_height_desktop: 600, min_height_mobile: 400 } as never),
    ).attributes('style')

    expect(style).toContain('--min-height-desktop: 600px')
    expect(style).toContain('--min-height-mobile: 400px')
  })

  it('falls back to the desktop min height when only that is set', () => {
    const style = mountSection(
      section({ min_height_desktop: 600 } as never),
    ).attributes('style')

    expect(style).toContain('--min-height-mobile: 600px')
  })

  it('renders nested blocks through the dispatcher', () => {
    const wrapper = mountSection(
      section({
        content: [
          { componentType: 'text', text: { content: 'Inside the section' } },
        ],
      } as never),
    )

    expect(wrapper.text()).toContain('Inside the section')
  })

  it('annotates the entry so the Amplience editor can highlight the field', () => {
    const wrapper = mountSection(section())

    expect(wrapper.attributes('data-amplience-entry-id')).toBe('section-1')
    expect(wrapper.attributes('data-amplience-field-id')).toBe('content')
  })
})
