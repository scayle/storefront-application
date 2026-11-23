<template>
  <div
    v-editable="contentElement"
    class="relative w-full overflow-hidden"
    :style="aspectRatioStyle"
  >
    <template v-if="!playing">
      <CmsPicture
        :desktop-sources="desktopPreviewSources"
        :mobile-sources="mobilePreviewSources"
        class="block size-full"
      >
        <img
          class="size-full object-contain object-center"
          :src="previewMobileImage"
          :alt="videoTitle"
        />
      </CmsPicture>
      <SFButton
        class="absolute top-1/2 left-1/2 -translate-1/2"
        :aria-label="$t('global.play_video')"
        :title="$t('global.play_video')"
        @click="startVideo"
      >
        <span aria-hidden="true">▶</span>
      </SFButton>
    </template>
    <video
      v-else
      ref="videoEl"
      playsinline
      :src="videoSource"
      :autoplay="autoplay"
      :controls="showControls"
      :loop="loop"
      :muted="muted"
      class="size-full object-contain"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { useCMSContext } from '@client/cms/shared/useCMSContext'
import type { VideoComponent as VideoComponentType } from '@shared/types/cms/storyblok'
import { createStoryblokSources } from '../utils/media'
import CmsPicture from './CmsPicture.vue'

const { contentElement } = defineProps<{
  contentElement: VideoComponentType
}>()

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()

const playing = ref(contentElement.autoplay ?? true)
const videoEl = useTemplateRef('videoEl')

/** Starts playback after the video element is rendered in the DOM. */
const startVideo = async () => {
  playing.value = true
  await nextTick()
  await videoEl.value?.play()
}

const previewDesktopImage = computed(
  () => contentElement.previewImageDesktop?.filename ?? '',
)
const previewMobileImage = computed(() => {
  return (
    contentElement.previewImageMobile?.filename || previewDesktopImage.value
  )
})

/** Generates desktop preview image sources for the video placeholder state. */
const desktopPreviewSources = computed(() => {
  if (!previewDesktopImage.value) {
    return []
  }
  return createStoryblokSources(
    previewDesktopImage.value,
    desktopViewportFraction.value,
  )
})

/** Generates mobile preview image sources for the video placeholder state. */
const mobilePreviewSources = computed(() => {
  if (!previewMobileImage.value) {
    return []
  }
  return createStoryblokSources(
    previewMobileImage.value,
    mobileViewportFraction.value,
  )
})

/** Maps Storyblok aspect ratio values to a CSS aspect-ratio inline style. */
const aspectRatioStyle = computed(() => {
  switch (contentElement.aspectRatio) {
    case '1:1':
      return { aspectRatio: '1 / 1' }
    case '4:3':
      return { aspectRatio: '4 / 3' }
    case '16:9':
    default:
      return { aspectRatio: '16 / 9' }
  }
})

const videoSource = computed(() => contentElement.video?.filename ?? '')
const videoTitle = computed(() => contentElement.video?.title ?? '')
const autoplay = computed(() => contentElement.autoplay ?? true)
const showControls = computed(() => contentElement.showControls ?? false)
const loop = computed(() => contentElement.loop ?? true)
const muted = computed(() => contentElement.muted ?? true)
</script>
