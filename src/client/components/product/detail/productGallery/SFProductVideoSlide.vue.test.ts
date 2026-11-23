import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import SFProductVideoSlide from './SFProductVideoSlide.vue'

const VIDEO_URL = 'https://cdn.example.com/hero.mp4'

const mountSlide = (
  props: Partial<{
    url: string
    posterUrl: string
    alt: string
    isPlaying: boolean
  }> = {},
) =>
  mount(SFProductVideoSlide, {
    props: {
      url: VIDEO_URL,
      alt: 'Hero video',
      ...props,
    },
  })

describe('SFProductVideoSlide', () => {
  it('reserves the product 3/4 frame and keeps the video preloaded none', () => {
    const wrapper = mountSlide()
    const frame = wrapper.find('[data-testid="product-video-slide"]')
    expect(frame.attributes('style')).toContain('aspect-ratio: 3 / 4')
    expect(wrapper.find('video').attributes('preload')).toBe('none')
    expect(wrapper.find('video').attributes('loop')).toBeDefined()
    expect(wrapper.find('video').attributes('playsinline')).toBeDefined()
    expect(wrapper.find('video').attributes('controls')).toBeDefined()
  })

  it('calls play when isPlaying turns true', async () => {
    const play = vi.fn().mockResolvedValue(undefined)
    const wrapper = mountSlide({ isPlaying: false })
    const video = wrapper.find('video').element as HTMLVideoElement
    video.play = play

    await wrapper.setProps({ isPlaying: true })
    await nextTick()

    expect(play).toHaveBeenCalled()
  })

  // Without the catch the rejection is unhandled, and Vitest fails the run.
  it('swallows the rejection when the browser blocks autoplay', async () => {
    const play = vi
      .fn()
      .mockRejectedValue(
        new DOMException('Autoplay blocked', 'NotAllowedError'),
      )
    const wrapper = mountSlide({ isPlaying: false })
    const video = wrapper.get('video').element as HTMLVideoElement
    video.play = play

    await wrapper.setProps({ isPlaying: true })
    await flushPromises()

    expect(play).toHaveBeenCalled()
  })

  it('emits play when the paused frame is clicked', async () => {
    const wrapper = mountSlide({ isPlaying: false })
    await wrapper.find('[data-testid="product-video-slide"]').trigger('click')
    expect(wrapper.emitted('play')).toHaveLength(1)
  })

  it('does not emit play from a frame click while already playing', async () => {
    const wrapper = mountSlide({ isPlaying: true })
    await nextTick()
    const before = wrapper.emitted('play')?.length ?? 0
    await wrapper.find('[data-testid="product-video-slide"]').trigger('click')
    expect(wrapper.emitted('play')?.length ?? 0).toBe(before)
  })

  it('pauses and rewinds to the start when another video takes over', async () => {
    const pause = vi.fn()
    const play = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountSlide({ isPlaying: false })
    const video = wrapper.find('video').element as HTMLVideoElement
    video.pause = pause
    video.play = play

    await wrapper.setProps({ isPlaying: true })
    await nextTick()
    expect(wrapper.find('video').attributes('src')).toBe(VIDEO_URL)

    video.currentTime = 12

    await wrapper.setProps({ isPlaying: false })
    await nextTick()

    expect(wrapper.find('video').attributes('src')).toBe(VIDEO_URL)
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
  })

  it('starts muted', () => {
    const wrapper = mountSlide({ isPlaying: true })
    expect(wrapper.find('video').attributes('muted')).toBeDefined()
  })
})
