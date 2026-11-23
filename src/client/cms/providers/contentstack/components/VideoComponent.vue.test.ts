import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { VideoComponent as VideoComponentType } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import VideoComponent from './VideoComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

const contentElement = {
  _content_type_uid: 'video-component',
  uid: 'video-1',
  autoplay: false,
} as unknown as VideoComponentType

const mountVideo = () =>
  mount(VideoComponent, {
    props: { contentElement },
    global: {
      directives: cmsDirectives,
      stubs: { SFButton: { template: '<button><slot /></button>' } },
      mocks: { $t: (key: string) => key },
    },
  })

describe('Contentstack VideoComponent', () => {
  it('names the play button with the translated label and tooltip', () => {
    const button = mountVideo().find('button')
    expect(button.attributes('aria-label')).toBe('global.play_video')
    expect(button.attributes('title')).toBe('global.play_video')
  })

  it('hides the decorative play glyph from assistive technology', () => {
    // All visible button content sits inside the hidden element, so screen
    // readers announce only the aria-label.
    const button = mountVideo().find('button')
    expect(button.get('[aria-hidden="true"]').text()).toBe(button.text())
  })
})
