import { computed } from 'vue'
import type {
  AspectRatioDesktop,
  ImageComponent as ImageComponentType,
} from '@shared/types/cms/amplience'
import ImageComponent from './ImageComponent.vue'

interface ImageStoryArgs {
  altText: string
  imageName: string
  mobileImageName: string
  aspectRatioDesktop: AspectRatioDesktop
  aspectRatioMobile: AspectRatioDesktop
}

const imageLink = (name: string) => ({
  id: name,
  name,
  endpoint: 'scayle',
  defaultHost: 'cdn.media.amplience.net',
})

const createContentElement = (args: ImageStoryArgs): ImageComponentType =>
  ({
    alt_text: args.altText,
    image_desktop: imageLink(args.imageName),
    image_mobile: args.mobileImageName
      ? imageLink(args.mobileImageName)
      : undefined,
    aspect_ratio_desktop: args.aspectRatioDesktop,
    aspect_ratio_mobile: args.aspectRatioMobile,
    _meta: { schema: 'https://scayle.com/schemas/image-component.json' },
  }) as unknown as ImageComponentType

const ASPECT_RATIOS: AspectRatioDesktop[] = [
  '16:9',
  '1:1',
  '4:3',
  '3:4',
  'original',
]

/**
 * Amplience Image component renders a responsive image through Dynamic Media.
 * Separate desktop and mobile assets are optional: when no mobile image is set,
 * the desktop one is used at mobile breakpoints.
 *
 * Each breakpoint requests AVIF, WebP, and JPEG candidates. A staging host is
 * rewritten to the production CDN, since browser image requests cannot carry
 * Virtual Staging Environment credentials.
 *
 * Amplience image links carry no intrinsic dimensions, so the `original` aspect
 * ratio leaves sizing to the loaded image rather than reserving a box.
 */
export default {
  title: 'CMS Amplience/Image',
  component: ImageComponent,
  argTypes: {
    altText: {
      control: 'text',
      description: 'Alternative text for the image',
      name: 'contentElement.alt_text',
    },
    imageName: {
      control: 'text',
      description: 'Dynamic Media asset name for the desktop image',
      name: 'contentElement.image_desktop.name',
    },
    mobileImageName: {
      control: 'text',
      description:
        'Dynamic Media asset name for the mobile image. Leave empty to reuse the desktop image.',
      name: 'contentElement.image_mobile.name',
    },
    aspectRatioDesktop: {
      control: 'select',
      options: ASPECT_RATIOS,
      description: 'Image proportions on desktop',
      name: 'contentElement.aspect_ratio_desktop',
    },
    aspectRatioMobile: {
      control: 'select',
      options: ASPECT_RATIOS,
      description: 'Image proportions on mobile',
      name: 'contentElement.aspect_ratio_mobile',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<ImageComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: ImageStoryArgs) => ({
    components: { ImageComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template: '<ImageComponent :content-element="contentElement" />',
  }),
}

const baseArgs = {
  altText: 'Campaign hero image',
  imageName: 'hero-desktop',
  mobileImageName: '',
  aspectRatioDesktop: '16:9',
  aspectRatioMobile: '16:9',
}

/** Widescreen hero using the desktop asset at every breakpoint */
export const Widescreen = { args: baseArgs }

export const Square = {
  args: {
    ...baseArgs,
    aspectRatioDesktop: '1:1',
    aspectRatioMobile: '1:1',
  },
}

/** Portrait on mobile, landscape on desktop */
export const PortraitOnMobile = {
  args: {
    ...baseArgs,
    aspectRatioDesktop: '16:9',
    aspectRatioMobile: '3:4',
  },
}

/** A dedicated mobile crop replaces the desktop asset below 1024px */
export const SeparateMobileImage = {
  args: {
    ...baseArgs,
    mobileImageName: 'hero-mobile',
    aspectRatioDesktop: '16:9',
    aspectRatioMobile: '1:1',
  },
}

/** Sizing is left to the loaded image, since Amplience exposes no dimensions */
export const OriginalRatio = {
  args: {
    ...baseArgs,
    aspectRatioDesktop: 'original',
    aspectRatioMobile: 'original',
  },
}
