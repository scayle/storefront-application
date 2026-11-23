import { computed } from 'vue'
import type { TypeVideoComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import VideoComponent from './VideoComponent.vue'

interface VideoStoryArgs {
  videoUrl: string
  previewImageDesktopUrl: string
  previewImageMobileUrl: string
  aspectRatio: '1:1' | '16:9' | '4:3'
  autoplay: boolean
  muted: boolean
  loop: boolean
  showControls: boolean
}

const createContentElement = (
  videoUrl: string,
  previewImageDesktopUrl: string,
  previewImageMobileUrl: string,
  aspectRatio: '1:1' | '16:9' | '4:3' = '16:9',
  autoplay = false,
  muted = true,
  loop = true,
  showControls = true,
): TypeVideoComponentWithoutUnresolvableLinksResponse =>
  ({
    sys: {
      id: 'video-basic',
      contentType: { sys: { id: 'VideoComponent' } },
    },
    fields: {
      video: {
        fields: {
          file: { url: videoUrl },
        },
      },
      previewImageDesktop: {
        fields: {
          file: { url: previewImageDesktopUrl },
        },
      },
      previewImageMobile: previewImageMobileUrl
        ? {
            fields: {
              file: { url: previewImageMobileUrl },
            },
          }
        : undefined,
      aspectRatio,
      autoplay,
      muted,
      loop,
      showControls,
    },
  }) as TypeVideoComponentWithoutUnresolvableLinksResponse

/**
 * Contentful Video component displays videos with preview images and configurable playback options.
 * Supports different aspect ratios and provides play controls with preview image thumbnails.
 */
export default {
  title: 'CMS Contentful/Video',
  component: VideoComponent,
  argTypes: {
    videoUrl: {
      control: 'text',
      description: 'Video file URL',
      name: 'contentElement.fields.video.fields.file.url',
    },
    previewImageDesktopUrl: {
      control: 'text',
      description: 'Desktop preview image URL',
      name: 'contentElement.fields.previewImageDesktop.fields.file.url',
    },
    previewImageMobileUrl: {
      control: 'text',
      description: 'Mobile preview image URL (optional)',
      name: 'contentElement.fields.previewImageMobile.fields.file.url',
    },
    aspectRatio: {
      control: 'select',
      options: ['1:1', '16:9', '4:3'],
      description: 'Video aspect ratio',
      name: 'contentElement.fields.aspectRatio',
    },
    autoplay: {
      control: 'boolean',
      description: 'Whether to autoplay the video',
      name: 'contentElement.fields.autoplay',
    },
    muted: {
      control: 'boolean',
      description: 'Whether the video is muted',
      name: 'contentElement.fields.muted',
    },
    loop: {
      control: 'boolean',
      description: 'Whether to loop the video',
      name: 'contentElement.fields.loop',
    },
    showControls: {
      control: 'boolean',
      description: 'Whether to show video controls',
      name: 'contentElement.fields.showControls',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<VideoComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: VideoStoryArgs) => ({
    components: { VideoComponent },
    setup() {
      const contentElement = computed(() =>
        createContentElement(
          args.videoUrl,
          args.previewImageDesktopUrl,
          args.previewImageMobileUrl,
          args.aspectRatio,
          args.autoplay,
          args.muted,
          args.loop,
          args.showControls,
        ),
      )
      return { contentElement }
    },
    template: '<VideoComponent :content-element="contentElement" />',
  }),
}

const baseVideoUrl = 'video.mp4'
const basePreviewImageUrl = 'desktopImage.avif'
const basePreviewImageMobileUrl = 'mobileImage.avif'

/** Default video with 16:9 aspect ratio and manual play */
export const Default = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspectRatio: '16:9',
    autoplay: false,
    muted: true,
    loop: true,
    showControls: true,
  },
}

/** Autoplay video that starts playing immediately */
export const Autoplay = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspectRatio: '16:9',
    autoplay: true,
    muted: true,
    loop: true,
    showControls: true,
  },
}

/** Square video with 1:1 aspect ratio */
export const SquareVideo = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspectRatio: '1:1',
    autoplay: false,
    muted: true,
    loop: true,
    showControls: true,
  },
}

/** Video with 4:3 aspect ratio */
export const FourToThreeRatio = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspectRatio: '4:3',
    autoplay: false,
    muted: true,
    loop: true,
    showControls: true,
  },
}

/** Video without controls and unmuted */
export const NoControlsUnmuted = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspectRatio: '16:9',
    autoplay: false,
    muted: false,
    loop: true,
    showControls: false,
  },
}

/** Video that does not loop and has no mobile preview */
export const NoLoopNoMobile = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: '',
    aspectRatio: '16:9',
    autoplay: false,
    muted: true,
    loop: false,
    showControls: true,
  },
}
