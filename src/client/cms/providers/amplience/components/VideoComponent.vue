<template>
  <div
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="video"
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
          :src="previewFallbackSrc"
          :alt="previewAltText"
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
      :poster="posterSrc"
      :autoplay="autoplay"
      :controls="showControls"
      :loop="loop"
      :muted="muted"
      class="size-full object-contain"
    >
      <source
        v-for="source in videoSources"
        :key="source.src"
        :src="source.src"
        :type="source.type"
      />
    </video>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { createLogger } from '@scayle/storefront/shared'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { useCMSContext } from '@client/cms/shared/useCMSContext'
import type { VideoComponent as VideoComponentType } from '@shared/types/cms/amplience'
import {
  buildAmplienceFallbackSrc,
  buildAmplienceVideoMetadataUrl,
  buildAmplienceVideoUrl,
  buildAmplienceVideoSourcesFromMetadata,
  createAmplienceSources,
} from '../utils/media'
import type {
  AmplienceVideoMetadata,
  AmplienceVideoSource,
} from '../utils/media'
import CmsPicture from './CmsPicture.vue'

const log = createLogger('cms')

const { contentElement } = defineProps<{
  contentElement: VideoComponentType
}>()

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()

const autoplay = computed(() => contentElement.autoplay ?? true)
const showControls = computed(() => contentElement.controls ?? false)
const loop = computed(() => contentElement.loop ?? true)
const muted = computed(() => contentElement.muted ?? true)

const playing = ref(autoplay.value)
const videoEl = useTemplateRef('videoEl')
const videoSources = ref<AmplienceVideoSource[]>([])

const videoLink = computed(() => contentElement.video)
const videoTitle = computed(() => contentElement.video?.name ?? '')

/**
 * Resolves the playable renditions for the video and decides whether the
 * `<video>` element can render at all.
 *
 * A Dynamic Media video URL without a transcode profile returns the poster
 * frame, not a stream, and only the asset's own metadata document lists which
 * profiles Amplience actually applied. So the profile list is fetched at
 * playback time and turned into one `<source>` per rendition.
 *
 * Playback stays off unless at least one rendition resolved. A failed request
 * and a response listing no addressable profile both leave nothing to play, and
 * an autoplaying block has already switched to the `<video>` element by then, so
 * without this it would render with no sources — a dead poster frame with no way
 * to try again.
 */
const loadVideoSources = async () => {
  const link = videoLink.value

  if (!link) {
    videoSources.value = []
    playing.value = false
    return
  }

  try {
    const response = await fetch(buildAmplienceVideoMetadataUrl(link))

    if (!response.ok) {
      throw new Error(`Metadata request failed with status ${response.status}`)
    }

    const metadata = (await response.json()) as AmplienceVideoMetadata
    videoSources.value = buildAmplienceVideoSourcesFromMetadata(link, metadata)
  } catch (error) {
    log.warn({
      message: 'Failed to load Amplience video renditions',
      err: error instanceof Error ? error : new Error(String(error)),
      videoName: link.name,
    })
    videoSources.value = []
  }

  playing.value = videoSources.value.length > 0
}

/** Starts playback after the video element is rendered in the DOM. */
const startVideo = async () => {
  await loadVideoSources()

  if (!playing.value) {
    return
  }

  await nextTick()
  await videoEl.value?.play()
}

// An autoplaying video renders the `<video>` element immediately, so its
// renditions have to be fetched without waiting for a click. SSR skips the
// request: nothing awaits it, so the sources would still be empty by the time
// the HTML is serialized, and the browser repeats the fetch after hydration.
watch(
  videoLink,
  async () => {
    if (autoplay.value && !import.meta.env.SSR) {
      await loadVideoSources()
    }
  },
  { immediate: true },
)

const posterImageDesktop = computed(() => contentElement.poster_image)

/** Amplience treats the mobile poster as optional, falling back to desktop. */
const posterImageMobile = computed(
  () => contentElement.poster_image_mobile ?? posterImageDesktop.value,
)

/**
 * Alt text for the preview image. Prefers the poster asset's own `altText` over
 * the video asset name, which is the upload-time file name and reads as noise in
 * a screen reader.
 */
const previewAltText = computed(
  () =>
    posterImageMobile.value?.altText ??
    posterImageDesktop.value?.altText ??
    videoTitle.value,
)

const previewFallbackSrc = computed(() => {
  const image = posterImageMobile.value ?? posterImageDesktop.value
  return image ? buildAmplienceFallbackSrc(image) : ''
})

/**
 * Poster for the `<video>` element itself. Falls back to the video's own poster
 * frame when the author set no preview image.
 */
const posterSrc = computed(() => {
  if (previewFallbackSrc.value) {
    return previewFallbackSrc.value
  }

  return videoLink.value ? buildAmplienceVideoUrl(videoLink.value) : undefined
})

const desktopPreviewSources = computed(() => {
  if (!posterImageDesktop.value) {
    return []
  }
  return createAmplienceSources(
    posterImageDesktop.value,
    desktopViewportFraction.value,
  )
})

const mobilePreviewSources = computed(() => {
  if (!posterImageMobile.value) {
    return []
  }
  return createAmplienceSources(
    posterImageMobile.value,
    mobileViewportFraction.value,
  )
})

/** Maps Amplience aspect ratio values to a CSS aspect-ratio inline style. */
const aspectRatioStyle = computed(() => {
  switch (contentElement.aspect_ratio) {
    case '1:1':
      return { aspectRatio: '1 / 1' }
    case '4:3':
      return { aspectRatio: '4 / 3' }
    case '16:9':
    default:
      return { aspectRatio: '16 / 9' }
  }
})
</script>
