import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import type { SectionComponent as SectionComponentType } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import SectionComponent from './SectionComponent.vue'

const cmsDirectives = { editable: vEditable }

const withBackground = {
  _uid: 'section-1',
  component: 'SectionComponent',
  content: [],
  backgroundImageDesktop: {
    filename: 'https://a.storyblok.com/f/1/1600x900/abc/bg.jpg',
  },
} as unknown as SectionComponentType

const withoutBackground = {
  _uid: 'section-2',
  component: 'SectionComponent',
  content: [],
} as unknown as SectionComponentType

const withBackgroundPriority = {
  ...withBackground,
  isPriorityImage: true,
} as unknown as SectionComponentType

const withEmptyMobileBackground = {
  ...withBackground,
  backgroundImageMobile: { filename: '' },
} as unknown as SectionComponentType

const global = {
  directives: cmsDirectives,
  stubs: { StoryblokBlockDispatch: true },
}

const mountSection = (contentElement: SectionComponentType) =>
  mount(SectionComponent, { props: { contentElement }, global })

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

describe('Storyblok SectionComponent', () => {
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

  it('applies the CMS isPriorityImage toggle to the background image', () => {
    // Mounted outside a page, so no position is claimed and only the editor
    // toggle drives the priority.
    const img = mountSection(withBackgroundPriority).find('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('falls back to the desktop background when the mobile asset is empty', () => {
    // Storyblok returns `filename: ''`, not `null`, for an empty asset field.
    const wrapper = mountSection(withEmptyMobileBackground)
    const desktopUrl = 'https://a.storyblok.com/f/1/1600x900/abc/bg.jpg'
    expect(wrapper.find('img').attributes('src')).toBe(desktopUrl)
    const mobileSources = wrapper.findAll('source[media="(width < 64rem)"]')
    expect(mobileSources.length).toBeGreaterThan(0)
    for (const source of mobileSources) {
      expect(source.attributes('srcset')).toContain(desktopUrl)
    }
  })
})
