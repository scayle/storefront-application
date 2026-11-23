import { computed } from 'vue'
import type {
  VideoComponent as VideoComponentType,
  File,
} from '@shared/types/cms/contentstack'
import VideoComponent from './VideoComponent.vue'

interface VideoStoryArgs {
  videoUrl: string
  previewImageDesktopUrl: string
  previewImageMobileUrl: string
  aspect_ratio: VideoComponentType['aspect_ratio']
  autoplay: boolean
  muted: boolean
  loop: boolean
  show_controls: boolean
}

const createFileAsset = (url: string): File =>
  ({
    url,
    dimension: { width: 1280, height: 720 },
  }) as unknown as File

const createContentElement = (
  videoUrl: string,
  previewImageDesktopUrl: string,
  previewImageMobileUrl: string,
  aspect_ratio: VideoComponentType['aspect_ratio'] = '16:9',
  autoplay = false,
  muted = true,
  loop = true,
  show_controls = true,
): VideoComponentType => ({
  video: createFileAsset(videoUrl),
  previewimagedesktop: createFileAsset(previewImageDesktopUrl),
  previewimagemobile: previewImageMobileUrl
    ? createFileAsset(previewImageMobileUrl)
    : undefined,
  aspect_ratio,
  autoplay,
  muted,
  loop,
  show_controls,
  _content_type_uid: 'video-component',
  uid: 'story-uid',
  title: 'Video',
})

const baseVideoUrl = 'video.mp4'
const basePreviewImageUrl = 'desktopImage.avif'
const basePreviewImageMobileUrl = 'mobileImage.avif'

/**
 * Contentstack Video component displays videos with preview images and configurable playback options.
 * Supports different aspect ratios and provides play controls with preview image thumbnails.
 */
export default {
  title: 'CMS Contentstack/Video',
  component: VideoComponent,
  argTypes: {
    videoUrl: {
      control: 'text',
      description: 'Video file URL',
      name: 'contentElement.video.url',
    },
    previewImageDesktopUrl: {
      control: 'text',
      description: 'Desktop preview image URL',
      name: 'contentElement.previewimagedesktop.url',
    },
    previewImageMobileUrl: {
      control: 'text',
      description: 'Mobile preview image URL (optional)',
      name: 'contentElement.previewimagemobile.url',
    },
    aspect_ratio: {
      control: 'select',
      options: ['', '1:1', '16:9', '4:3'],
      description: 'Video aspect ratio',
      name: 'contentElement.aspect_ratio',
    },
    autoplay: {
      control: 'boolean',
      description: 'Whether to autoplay the video',
      name: 'contentElement.autoplay',
    },
    muted: {
      control: 'boolean',
      description: 'Whether the video is muted',
      name: 'contentElement.muted',
    },
    loop: {
      control: 'boolean',
      description: 'Whether to loop the video',
      name: 'contentElement.loop',
    },
    show_controls: {
      control: 'boolean',
      description: 'Whether to show video controls',
      name: 'contentElement.show_controls',
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
          args.aspect_ratio,
          args.autoplay,
          args.muted,
          args.loop,
          args.show_controls,
        ),
      )
      return { contentElement }
    },
    template: '<VideoComponent :content-element="contentElement" />',
  }),
}

/** Default video with 16:9 aspect ratio and manual play */
export const Default = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspect_ratio: '16:9',
    autoplay: false,
    muted: true,
    loop: true,
    show_controls: true,
  },
}

/** Autoplay video that starts playing immediately */
export const Autoplay = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspect_ratio: '16:9',
    autoplay: true,
    muted: true,
    loop: true,
    show_controls: true,
  },
}

/** Square video with 1:1 aspect ratio */
export const SquareVideo = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspect_ratio: '1:1',
    autoplay: false,
    muted: true,
    loop: true,
    show_controls: true,
  },
}

/** Video with 4:3 aspect ratio */
export const FourToThreeRatio = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspect_ratio: '4:3',
    autoplay: false,
    muted: true,
    loop: true,
    show_controls: true,
  },
}

/** Video without controls and unmuted */
export const NoControlsUnmuted = {
  args: {
    videoUrl: baseVideoUrl,
    previewImageDesktopUrl: basePreviewImageUrl,
    previewImageMobileUrl: basePreviewImageMobileUrl,
    aspect_ratio: '16:9',
    autoplay: false,
    muted: false,
    loop: true,
    show_controls: false,
  },
}
