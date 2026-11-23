import { computed } from 'vue'
import type {
  VideoComponent as VideoComponentType,
  StoryblokAsset,
} from '@shared/types/cms/storyblok'
import VideoComponent from './VideoComponent.vue'

interface VideoStoryArgs {
  videoUrl: string
  previewImageDesktopUrl: string
  previewImageMobileUrl: string
  aspectRatio: VideoComponentType['aspectRatio']
  autoplay: boolean
  muted: boolean
  loop: boolean
  showControls: boolean
}

const createContentElement = (
  videoUrl: string,
  previewImageDesktopUrl: string,
  previewImageMobileUrl: string,
  aspectRatio: VideoComponentType['aspectRatio'] = '16:9',
  autoplay = false,
  muted = true,
  loop = true,
  showControls = true,
): VideoComponentType => ({
  video: { filename: videoUrl } as StoryblokAsset,
  previewImageDesktop: {
    filename: previewImageDesktopUrl,
    meta_data: { size: '1280x720' },
  } as unknown as StoryblokAsset,
  previewImageMobile: previewImageMobileUrl
    ? ({
        filename: previewImageMobileUrl,
        meta_data: { size: '1280x720' },
      } as unknown as StoryblokAsset)
    : undefined,
  aspectRatio,
  autoplay,
  muted,
  loop,
  showControls,
  component: 'VideoComponent',
  _uid: 'story-uid',
})

const baseVideoUrl = 'video.mp4'
const basePreviewImageUrl = 'desktopImage.avif'
const basePreviewImageMobileUrl = 'mobileImage.avif'

/**
 * Storyblok Video component displays videos with preview images and configurable playback options.
 * Supports different aspect ratios and provides play controls with preview image thumbnails.
 */
export default {
  title: 'CMS Storyblok/Video',
  component: VideoComponent,
  argTypes: {
    videoUrl: {
      control: 'text',
      description: 'Video file URL',
      name: 'contentElement.video.filename',
    },
    previewImageDesktopUrl: {
      control: 'text',
      description: 'Desktop preview image URL',
      name: 'contentElement.previewImageDesktop.filename',
    },
    previewImageMobileUrl: {
      control: 'text',
      description: 'Mobile preview image URL (optional)',
      name: 'contentElement.previewImageMobile.filename',
    },
    aspectRatio: {
      control: 'select',
      options: ['', '1:1', '16:9', '4:3'],
      description: 'Video aspect ratio',
      name: 'contentElement.aspectRatio',
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
    showControls: {
      control: 'boolean',
      description: 'Whether to show video controls',
      name: 'contentElement.showControls',
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
