<template>
  <div
    v-live-preview:video="contentElement"
    class="flex aspect-(--aspect-ratio) w-full items-center justify-center overflow-hidden object-bottom"
    :style="cssVars"
  >
    <div
      v-if="!playing"
      class="relative m-auto flex size-full items-center justify-center"
    >
      <CmsPicture
        :desktop-sources="desktopPreviewSources"
        :mobile-sources="mobilePreviewSources"
      >
        <img
          class="size-full object-cover object-center"
          :src="previewFallbackImage"
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
    </div>
    <video
      v-else
      ref="videoEl"
      playsinline
      :src="videoSource"
      :autoplay="autoplay"
      :controls="showControls"
      :loop="loop"
      :muted="muted"
      class="m-auto size-full max-h-full max-w-full object-contain"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { useCMSContext } from '@client/cms/shared/useCMSContext'
import type { VideoComponent } from '@shared/types/cms/contentstack'
import { createContentstackSources } from '../utils/media'
import CmsPicture from './CmsPicture.vue'

const { contentElement } = defineProps<{
  contentElement: VideoComponent
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
  () => contentElement.previewimagedesktop?.url ?? '',
)

const previewMobileImage = computed(
  () => contentElement.previewimagemobile?.url ?? previewDesktopImage.value,
)

const previewFallbackImage = computed(
  () => previewMobileImage.value || previewDesktopImage.value,
)

/** Generates desktop preview image sources for the video placeholder state. */
const desktopPreviewSources = computed(() => {
  if (!previewDesktopImage.value) {
    return []
  }
  return createContentstackSources(
    previewDesktopImage.value,
    desktopViewportFraction.value,
  )
})

/** Generates mobile preview image sources for the video placeholder state. */
const mobilePreviewSources = computed(() => {
  if (!previewMobileImage.value) {
    return []
  }
  return createContentstackSources(
    previewMobileImage.value,
    mobileViewportFraction.value,
  )
})

/** Maps Contentstack aspect ratio values to CSS ratio strings. */
const cssVars = computed(() => {
  switch (contentElement.aspect_ratio) {
    case '1:1':
      return { '--aspect-ratio': '1/1' }
    case '4:3':
      return { '--aspect-ratio': '4/3' }
    case '16:9':
    default:
      return { '--aspect-ratio': '16/9' }
  }
})

const videoSource = computed(() => contentElement.video?.url ?? '')
const videoTitle = computed(() => contentElement.video?.title ?? '')
const autoplay = computed(() => contentElement.autoplay ?? true)
const showControls = computed(() => contentElement.show_controls ?? false)
const loop = computed(() => contentElement.loop ?? true)
const muted = computed(() => contentElement.muted ?? true)
</script>
