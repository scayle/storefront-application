import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ImageComponent as ImageComponentType } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import ImageComponent from './ImageComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

let lcpIndex = -1
vi.mock('@client/cms/shared/useLcpPriority', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@client/cms/shared/useLcpPriority')
  >()),
  useLcpPriority: () => ({ claim: () => lcpIndex }),
}))

const contentElement = {
  _content_type_uid: 'image-component',
  uid: 'img-1',
  alt_text: 'Hero',
  image_desktop: {
    url: 'https://images.contentstack.io/hero.jpg',
    dimension: { width: 1600, height: 900 },
  },
} as unknown as ImageComponentType

const priorityContentElement = {
  ...contentElement,
  is_priority_image: true,
} as unknown as ImageComponentType

const mountImage = (element: ImageComponentType = contentElement) =>
  mount(ImageComponent, {
    props: { contentElement: element },
    global: { directives: cmsDirectives },
  })

afterEach(() => {
  lcpIndex = -1
})

describe('Contentstack ImageComponent', () => {
  it('passes its claimed document-order position to the priority heuristic', () => {
    // The position-to-priority table is tested once in
    // `shared/useLcpPriority.vue.test.ts`; the first position is the one that
    // differs from an unclaimed image.
    lcpIndex = 0
    const img = mountImage().find('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('applies the CMS is_priority_image toggle (high + eager) for a non-first image', () => {
    // lcpIndex stays -1, so only the editor toggle drives the priority.
    const img = mountImage(priorityContentElement).find('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('renders no responsive sources when the block has no image', () => {
    const element = {
      ...contentElement,
      image_desktop: undefined,
    } as unknown as ImageComponentType

    expect(mountImage(element).findAll('source')).toHaveLength(0)
  })
})
