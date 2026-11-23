import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import type { SectionComponent as SectionComponentType } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import SectionComponent from './SectionComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

const withBackground = {
  _content_type_uid: 'section',
  uid: 'section-1',
  content: [],
  background_image_desktop: {
    url: 'https://images.contentstack.io/bg.jpg',
  },
} as unknown as SectionComponentType

const withoutBackground = {
  _content_type_uid: 'section',
  uid: 'section-2',
  content: [],
} as unknown as SectionComponentType

const withBackgroundPriority = {
  ...withBackground,
  is_priority_image: true,
} as unknown as SectionComponentType

const global = {
  directives: cmsDirectives,
  stubs: { ContentstackBlockDispatch: true },
}

/** Mounts the sections in document order inside a page that hands out LCP positions. */
const mountInPage = (...sections: SectionComponentType[]) =>
  mount(
    defineComponent({
      setup() {
        provideLcpPriority()
        return () =>
          sections.map((contentElement) =>
            h(SectionComponent, { contentElement }),
          )
      },
    }),
    { global },
  )

describe('Contentstack SectionComponent', () => {
  it('passes its claimed document-order position to the priority heuristic', () => {
    // The position-to-priority table is tested once in
    // `shared/useLcpPriority.vue.test.ts`; the first position is the one that
    // differs from an unclaimed image.
    const img = mountInPage(withBackground).get('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('leaves the first position to the next image when it has no background image', () => {
    const img = mountInPage(withoutBackground, withBackground).get('img')
    expect(img.attributes('fetchpriority')).toBe('high')
  })

  it('applies the CMS is_priority_image toggle to the background image', () => {
    // Mounted outside a page, so no position is claimed and only the editor
    // toggle drives the priority.
    const img = mount(SectionComponent, {
      props: { contentElement: withBackgroundPriority },
      global,
    }).get('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })
})
