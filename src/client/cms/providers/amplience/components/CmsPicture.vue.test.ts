import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { CMSImageSource } from '@client/cms/shared/image'
import CmsPicture from './CmsPicture.vue'

const source = (type: string, srcset: string): CMSImageSource => ({
  type,
  srcset,
  sizes: '100vw',
})

describe('CmsPicture', () => {
  it('renders a desktop and a mobile source per candidate', () => {
    const wrapper = mount(CmsPicture, {
      props: {
        desktopSources: [source('image/avif', 'desktop.avif')],
        mobileSources: [source('image/avif', 'mobile.avif')],
      },
    })

    const sources = wrapper.findAll('source')
    expect(sources).toHaveLength(2)
    expect(sources[0]?.attributes('media')).toBe('(min-width: 64rem)')
    expect(sources[0]?.attributes('srcset')).toBe('desktop.avif')
    expect(sources[1]?.attributes('media')).toBe('(width < 64rem)')
    expect(sources[1]?.attributes('srcset')).toBe('mobile.avif')
  })

  it('renders the slotted fallback image inside the picture', () => {
    const wrapper = mount(CmsPicture, {
      props: { desktopSources: [], mobileSources: [] },
      slots: { default: '<img src="fallback.jpg" alt="" />' },
    })

    expect(wrapper.element.tagName).toBe('PICTURE')
    expect(wrapper.get('img').attributes('src')).toBe('fallback.jpg')
  })

  it('forwards class and style to the picture root', () => {
    const wrapper = mount(CmsPicture, {
      props: { desktopSources: [], mobileSources: [] },
      attrs: { class: 'absolute inset-0', style: 'grid-area: stack' },
    })

    expect(wrapper.classes()).toContain('absolute')
    expect(wrapper.attributes('style')).toContain('grid-area: stack')
  })
})
