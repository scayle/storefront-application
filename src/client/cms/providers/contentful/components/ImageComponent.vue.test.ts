import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TypeImageComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import ImageComponent from './ImageComponent.vue'

let lcpIndex = -1
vi.mock('@client/cms/shared/useLcpPriority', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@client/cms/shared/useLcpPriority')
  >()),
  useLcpPriority: () => ({ claim: () => lcpIndex }),
}))

const contentElement = {
  sys: { id: 'img-1' },
  fields: {
    altText: 'Hero',
    imageDesktop: {
      fields: {
        file: {
          url: '//images.ctfassets.net/hero.jpg',
          details: { image: { width: 1600, height: 900 } },
        },
      },
    },
  },
} as unknown as TypeImageComponentWithoutUnresolvableLinksResponse

const priorityContentElement = {
  ...contentElement,
  fields: { ...contentElement.fields, isPriorityImage: true },
} as unknown as TypeImageComponentWithoutUnresolvableLinksResponse

const mountImage = (
  element: TypeImageComponentWithoutUnresolvableLinksResponse = contentElement,
) => mount(ImageComponent, { props: { contentElement: element } })

afterEach(() => {
  lcpIndex = -1
})

describe('Contentful ImageComponent', () => {
  // The index-to-priority table is tested in shared/useLcpPriority.vue.test.ts;
  // this proves the claimed index reaches the rendered image.
  it('loads the first image on the page eagerly at high priority', () => {
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
})
