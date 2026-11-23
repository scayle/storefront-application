<!-- eslint-disable vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- Pointer shortcut that starts a paused video. Keyboard users play it with the native video controls, which also emit `play`. -->
<template>
  <div
    class="relative isolate size-full min-h-0 min-w-0 overflow-hidden rounded-md bg-product-image-background"
    :class="{ 'cursor-pointer': !isPlaying }"
    :style="{
      aspectRatio: `${PRODUCT_IMAGE_ASPECT_RATIO[0]} / ${PRODUCT_IMAGE_ASPECT_RATIO[1]}`,
    }"
    data-testid="product-video-slide"
    @click.stop="onFrameClick"
  >
    <video
      ref="videoEl"
      :src="url"
      :poster="posterUrl"
      muted
      loop
      playsinline
      controls
      disablePictureInPicture
      disableRemotePlayback
      preload="none"
      class="size-full object-contain"
      :aria-label="alt"
      data-testid="product-video"
      @play="emit('play')"
    />
  </div>
</template>
<!-- eslint-enable vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMounted } from '@vueuse/core'
import { PRODUCT_IMAGE_ASPECT_RATIO } from '@client/constants'

const {
  url,
  posterUrl,
  alt,
  isPlaying = false,
} = defineProps<{
  /** Absolute playable video URL. */
  url: string
  /** Frame-capture poster. Omitted for externally hosted videos. */
  posterUrl?: string
  /** Accessible name for the video element. */
  alt: string
  /** Whether this slide or tile is the one video allowed to play. */
  isPlaying?: boolean
}>()

const emit = defineEmits<{
  /**
   * Emitted on the DOM `play` event (autoplay and user gesture) and when the
   * paused frame is clicked so the gallery can make this the active video.
   */
  play: []
}>()

const videoEl = ref<HTMLVideoElement>()
const isMounted = useMounted()

const playVideo = async () => {
  const video = videoEl.value
  if (!video || !isMounted.value) {
    return
  }
  try {
    await video.play()
  } catch {
    // Autoplay policies reject play(); the poster stays visible.
  }
}

/**
 * Pauses playback and resets `currentTime` to 0 when this slide is no longer
 * the active video.
 */
const pauseVideo = () => {
  if (!videoEl.value) {
    return
  }
  videoEl.value.pause()
  videoEl.value.currentTime = 0
}

const onFrameClick = () => {
  if (isPlaying) {
    return
  }
  emit('play')
}

watch(
  [() => isPlaying, isMounted],
  ([shouldPlay, mounted]) => {
    if (!mounted) {
      return
    }
    if (shouldPlay) {
      void playVideo()
      return
    }
    pauseVideo()
  },
  { flush: 'post' },
)
</script>
