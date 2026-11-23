import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VideoComponent as VideoComponentType } from '@shared/types/cms/amplience'
import VideoComponent from './VideoComponent.vue'

const videoAsset = {
  id: 'v',
  name: 'hero-video',
  endpoint: 'scayle',
  defaultHost: 'cdn.media.amplience.net',
}

const posterImage = {
  id: 'p',
  name: 'hero-poster',
  endpoint: 'scayle',
  defaultHost: 'cdn.media.amplience.net',
  altText: 'A model wearing the jacket',
}

const contentElement = {
  _meta: { schema: 'x', deliveryId: 'video-1' },
  video: videoAsset,
  poster_image: posterImage,
  autoplay: false,
} as unknown as VideoComponentType

const metadataResponse = {
  media: [
    // `src` is ignored: the component rebuilds each URL from the profile name.
    { src: 'https://a', profile: 'mp4_1080p', bitrate: '4000' },
    { src: 'https://b', profile: 'mp4_480p', bitrate: '800' },
  ],
}

const respondWith = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    json: async () => body,
  })

const mountVideo = (element: VideoComponentType = contentElement) =>
  mount(VideoComponent, {
    props: { contentElement: element },
    global: {
      stubs: { SFButton: { template: '<button><slot /></button>' } },
      mocks: { $t: (key: string) => key },
    },
  })

beforeEach(() => {
  // happy-dom does not implement playback, and the component awaits it.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

describe('Amplience VideoComponent', () => {
  it('renders one source per rendition once the metadata resolves', async () => {
    vi.stubGlobal('fetch', respondWith(metadataResponse))

    const wrapper = mountVideo()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    const sources = wrapper.findAll('video source')
    expect(sources).toHaveLength(2)
    expect(sources[0]?.attributes('src')).toContain('mp4_1080p')
    expect(sources[0]?.attributes('type')).toBe('video/mp4')
  })

  it('requests the metadata document for the video asset', async () => {
    const fetchSpy = respondWith(metadataResponse)
    vi.stubGlobal('fetch', fetchSpy)

    await mountVideo().find('button').trigger('click')
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cdn.media.amplience.net/v/scayle/hero-video.json',
    )
  })

  it.for([
    {
      failure: 'responds with an error status',
      fetch: () => respondWith({}, false),
    },
    {
      failure: 'rejects',
      fetch: () => vi.fn().mockRejectedValue(new Error('offline')),
    },
  ])(
    'keeps the play button when the metadata request $failure, so playback can be retried',
    async ({ fetch }) => {
      vi.stubGlobal('fetch', fetch())

      const wrapper = mountVideo()
      await wrapper.find('button').trigger('click')
      await flushPromises()

      expect(wrapper.find('video').exists()).toBe(false)
      expect(wrapper.find('button').exists()).toBe(true)
    },
  )

  it('falls back from an autoplaying video to the poster when no rendition resolves', async () => {
    vi.stubGlobal('fetch', respondWith({ media: [] }))

    const wrapper = mountVideo({
      ...contentElement,
      autoplay: true,
    } as VideoComponentType)
    await flushPromises()

    expect(wrapper.find('video').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('does not request metadata for a block with no video asset', async () => {
    const fetchSpy = respondWith(metadataResponse)
    vi.stubGlobal('fetch', fetchSpy)

    const wrapper = mountVideo({
      ...contentElement,
      video: undefined,
    } as unknown as VideoComponentType)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('prefers the poster asset alt text over the video file name', () => {
    expect(mountVideo().find('img').attributes('alt')).toBe(
      'A model wearing the jacket',
    )
  })

  it('falls back to the video asset name when the poster carries no alt text', () => {
    const wrapper = mountVideo({
      ...contentElement,
      poster_image: { ...posterImage, altText: undefined },
    } as unknown as VideoComponentType)

    expect(wrapper.find('img').attributes('alt')).toBe('hero-video')
  })

  it('uses the dedicated mobile poster when the author provided one', () => {
    const wrapper = mountVideo({
      ...contentElement,
      poster_image_mobile: { ...posterImage, name: 'hero-poster-mobile' },
    } as unknown as VideoComponentType)

    const mobileSources = wrapper
      .findAll('source')
      .filter((source) => source.attributes('media') === '(width < 64rem)')

    expect(mobileSources[0]?.attributes('srcset')).toContain(
      'hero-poster-mobile',
    )
  })

  it('falls back to the video poster frame when the author set no preview image', async () => {
    vi.stubGlobal('fetch', respondWith(metadataResponse))

    const wrapper = mountVideo({
      ...contentElement,
      poster_image: undefined,
    } as unknown as VideoComponentType)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('video').attributes('poster')).toBe(
      'https://cdn.media.amplience.net/v/scayle/hero-video',
    )
  })

  it.each([
    { ratio: '1:1', expected: '1 / 1' },
    { ratio: '4:3', expected: '4 / 3' },
    { ratio: '16:9', expected: '16 / 9' },
  ])(
    'applies the $ratio aspect ratio as an inline style',
    ({ ratio, expected }) => {
      const wrapper = mountVideo({
        ...contentElement,
        aspect_ratio: ratio,
      } as unknown as VideoComponentType)

      expect(wrapper.attributes('style')).toContain(`aspect-ratio: ${expected}`)
    },
  )

  it('defaults to 16 / 9 when the author set no aspect ratio', () => {
    expect(mountVideo().attributes('style')).toContain('aspect-ratio: 16 / 9')
  })

  it('annotates the entry so the Amplience editor can highlight the field', () => {
    const wrapper = mountVideo()

    expect(wrapper.attributes('data-amplience-entry-id')).toBe('video-1')
    expect(wrapper.attributes('data-amplience-field-id')).toBe('video')
  })

  it('names the play button with the translated label and tooltip', () => {
    const button = mountVideo().find('button')
    expect(button.attributes('aria-label')).toBe('global.play_video')
    expect(button.attributes('title')).toBe('global.play_video')
  })

  it('hides the decorative play glyph from assistive technology', () => {
    const button = mountVideo().find('button')
    expect(button.find('[aria-hidden="true"]').exists()).toBe(true)
  })
})
