import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ImageComponent as ImageComponentType } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import ImageComponent from './ImageComponent.vue'

const cmsDirectives = { editable: vEditable }

let lcpIndex = -1
vi.mock('@client/cms/shared/useLcpPriority', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@client/cms/shared/useLcpPriority')
  >()),
  useLcpPriority: () => ({ claim: () => lcpIndex }),
}))

const contentElement = {
  _uid: 'img-1',
  component: 'ImageComponent',
  altText: 'Hero',
  imageDesktop: {
    filename: 'https://a.storyblok.com/f/1/1600x900/abc/hero.jpg',
  },
} as unknown as ImageComponentType

const priorityContentElement = {
  ...contentElement,
  isPriorityImage: true,
} as unknown as ImageComponentType

const emptyMobileContentElement = {
  ...contentElement,
  imageMobile: { filename: '' },
} as unknown as ImageComponentType

const mountImage = (element: ImageComponentType = contentElement) =>
  mount(ImageComponent, {
    props: { contentElement: element },
    global: { directives: cmsDirectives },
  })

afterEach(() => {
  lcpIndex = -1
})

describe('Storyblok ImageComponent', () => {
  it('passes its claimed document-order position to the priority heuristic', () => {
    // The position-to-priority table is tested once in
    // `shared/useLcpPriority.vue.test.ts`; the first position is the one that
    // differs from an unclaimed image.
    lcpIndex = 0
    const img = mountImage().find('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('applies the CMS isPriorityImage toggle (high + eager) for a non-first image', () => {
    // lcpIndex stays -1, so only the editor toggle drives the priority.
    const img = mountImage(priorityContentElement).find('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('falls back to the desktop image when the mobile asset is empty', () => {
    // Storyblok returns `filename: ''`, not `null`, for an empty asset field.
    const wrapper = mountImage(emptyMobileContentElement)
    const desktopUrl = 'https://a.storyblok.com/f/1/1600x900/abc/hero.jpg'
    expect(wrapper.find('img').attributes('src')).toBe(desktopUrl)
    const mobileSources = wrapper.findAll('source[media="(width < 64rem)"]')
    expect(mobileSources.length).toBeGreaterThan(0)
    for (const source of mobileSources) {
      expect(source.attributes('srcset')).toContain(desktopUrl)
    }
  })
})
