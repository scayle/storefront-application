import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { TypeVideoComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import VideoComponent from './VideoComponent.vue'

const contentElement = {
  sys: { id: 'video-1' },
  fields: { autoplay: false },
} as unknown as TypeVideoComponentWithoutUnresolvableLinksResponse

const mountVideo = () =>
  mount(VideoComponent, {
    props: { contentElement },
    global: {
      stubs: { SFButton: { template: '<button><slot /></button>' } },
      mocks: { $t: (key: string) => key },
    },
  })

describe('Contentful VideoComponent', () => {
  it('names the play button with the translated label and tooltip', () => {
    const button = mountVideo().find('button')
    expect(button.attributes('aria-label')).toBe('global.play_video')
    expect(button.attributes('title')).toBe('global.play_video')
  })

  it('hides the decorative play glyph from assistive technology', () => {
    const button = mountVideo().get('button')
    const glyph = button.get('[aria-hidden="true"]')

    // Any visible content outside the hidden glyph would be read out next to
    // the aria-label.
    expect(glyph.text()).not.toBe('')
    expect(button.text()).toBe(glyph.text())
  })
})
