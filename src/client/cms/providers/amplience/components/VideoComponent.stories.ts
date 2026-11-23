import { computed } from 'vue'
import type {
  AspectRatio,
  VideoComponent as VideoComponentType,
} from '@shared/types/cms/amplience'
import VideoComponent from './VideoComponent.vue'

interface VideoStoryArgs {
  videoName: string
  posterImageName: string
  aspectRatio: AspectRatio
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
}

const mediaLink = (name: string) => ({
  id: name,
  name,
  endpoint: 'scayle',
  defaultHost: 'cdn.media.amplience.net',
})

const createContentElement = (args: VideoStoryArgs): VideoComponentType =>
  ({
    video: mediaLink(args.videoName),
    poster_image: args.posterImageName
      ? mediaLink(args.posterImageName)
      : undefined,
    aspect_ratio: args.aspectRatio,
    autoplay: args.autoplay,
    loop: args.loop,
    muted: args.muted,
    controls: args.controls,
    _meta: { schema: 'https://scayle.com/schemas/video-component.json' },
  }) as unknown as VideoComponentType

/**
 * Amplience Video component plays a Dynamic Media video behind an optional preview
 * image. Playable renditions are discovered from the asset's own metadata
 * document, because a Dynamic Media video URL without a transcode profile returns
 * the poster frame rather than a stream.
 *
 * In Storybook the metadata request does not resolve, so the stories document the
 * preview state and the player controls rather than real playback.
 */
export default {
  title: 'CMS Amplience/Video',
  component: VideoComponent,
  argTypes: {
    videoName: {
      control: 'text',
      description: 'Dynamic Media asset name for the video',
      name: 'contentElement.video.name',
    },
    posterImageName: {
      control: 'text',
      description:
        'Dynamic Media asset name for the preview image. Leave empty to use the video poster frame.',
      name: 'contentElement.poster_image.name',
    },
    aspectRatio: {
      control: 'select',
      options: ['16:9', '1:1', '4:3'],
      description: 'Shape of the video player',
      name: 'contentElement.aspect_ratio',
    },
    autoplay: {
      control: 'boolean',
      description: 'Whether playback starts without user interaction',
      name: 'contentElement.autoplay',
    },
    loop: {
      control: 'boolean',
      description: 'Whether playback repeats',
      name: 'contentElement.loop',
    },
    muted: {
      control: 'boolean',
      description: 'Whether the video starts muted',
      name: 'contentElement.muted',
    },
    controls: {
      control: 'boolean',
      description: 'Whether native player controls are shown',
      name: 'contentElement.controls',
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
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template: '<VideoComponent :content-element="contentElement" />',
  }),
}

const baseArgs = {
  videoName: 'campaign-film',
  posterImageName: 'campaign-poster',
  aspectRatio: '16:9',
  autoplay: false,
  loop: true,
  muted: true,
  controls: false,
}

/** Preview image with a play button, waiting for the user to start playback */
export const WithPreviewImage = { args: baseArgs }

/** No preview image, so the video's own poster frame is used */
export const WithoutPreviewImage = {
  args: { ...baseArgs, posterImageName: '' },
}

/** Autoplaying background video, muted and looping */
export const AutoplayBackground = {
  args: { ...baseArgs, autoplay: true, muted: true, loop: true },
}

/** Player with native controls, for a video the user chooses to watch */
export const WithControls = {
  args: { ...baseArgs, controls: true, muted: false, loop: false },
}

export const Square = {
  args: { ...baseArgs, aspectRatio: '1:1' },
}
