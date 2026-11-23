import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type {
  StoryblokAsset,
  VideoComponent as VideoComponentType,
} from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import VideoComponent from './VideoComponent.vue'

const cmsDirectives = { editable: vEditable }

const buildContentElement = (
  aspectRatio: VideoComponentType['aspectRatio'],
): VideoComponentType =>
  ({
    _uid: 'video-1',
    component: 'VideoComponent',
    aspectRatio,
    video: { filename: 'https://a.storyblok.com/video.mp4' } as StoryblokAsset,
    previewImageDesktop: {
      filename: 'https://a.storyblok.com/f/space/1280x720/desktop.avif',
    } as StoryblokAsset,
    previewImageMobile: {
      filename: 'https://a.storyblok.com/f/space/750x1334/mobile.avif',
    } as StoryblokAsset,
    autoplay: false,
    muted: true,
    loop: true,
    showControls: true,
  }) as VideoComponentType

const mountVideo = (
  aspectRatio: VideoComponentType['aspectRatio'],
  overrides: Partial<VideoComponentType> = {},
) =>
  mount(VideoComponent, {
    props: {
      contentElement: { ...buildContentElement(aspectRatio), ...overrides },
    },
    global: {
      directives: cmsDirectives,
      stubs: {
        SFButton: { template: '<button><slot /></button>' },
      },
      mocks: { $t: (key: string) => key },
    },
  })

describe('VideoComponent (Storyblok)', () => {
  it.for([
    ['1:1', '1 / 1'],
    ['4:3', '4 / 3'],
    ['16:9', '16 / 9'],
    ['', '16 / 9'],
    [undefined, '16 / 9'],
  ] as const)(
    'applies aspect-ratio %s as inline style %s',
    ([input, expected]) => {
      const wrapper = mountVideo(input)
      expect(wrapper.element.getAttribute('style')).toContain(
        `aspect-ratio: ${expected}`,
      )
    },
  )

  it('falls back to the desktop preview image when the mobile asset is empty', () => {
    // Storyblok returns `filename: ''`, not `null`, for an empty asset field.
    const wrapper = mountVideo('16:9', {
      previewImageMobile: { filename: '' } as StoryblokAsset,
    })
    const desktopUrl = 'https://a.storyblok.com/f/space/1280x720/desktop.avif'
    expect(wrapper.find('img').attributes('src')).toBe(desktopUrl)
    const mobileSources = wrapper.findAll('source[media="(width < 64rem)"]')
    expect(mobileSources.length).toBeGreaterThan(0)
    for (const source of mobileSources) {
      expect(source.attributes('srcset')).toContain(desktopUrl)
    }
  })

  it('names the play button with the translated label and tooltip', () => {
    const button = mountVideo('16:9').find('button')
    expect(button.attributes('aria-label')).toBe('global.play_video')
    expect(button.attributes('title')).toBe('global.play_video')
  })

  it('hides the decorative play glyph from assistive technology', () => {
    const button = mountVideo('16:9').find('button')
    const glyph = button.find('[aria-hidden="true"]')
    expect(glyph.text()).not.toBe('')
    // The aria-label names the button, so no visible text may sit outside the
    // hidden glyph.
    expect(glyph.text()).toBe(button.text())
  })
})
