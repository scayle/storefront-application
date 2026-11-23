import { computed } from 'vue'
import type {
  ImageComponent as ImageComponentType,
  File,
} from '@shared/types/cms/contentstack'
import ImageComponent from './ImageComponent.vue'

interface ImageStoryArgs {
  desktopImageUrl: string
  mobileImageUrl: string
  alt_text: string
  aspect_ratio_desktop: ImageComponentType['aspect_ratio_desktop']
  aspect_ratio_mobile: ImageComponentType['aspect_ratio_mobile']
}

const createFileAsset = (url: string): File =>
  ({
    url,
    dimension: { width: 1280, height: 1455 },
  }) as unknown as File

const createContentElement = (
  desktopImageUrl: string,
  mobileImageUrl: string,
  alt_text: string,
  aspect_ratio_desktop: ImageComponentType['aspect_ratio_desktop'] = 'original',
  aspect_ratio_mobile: ImageComponentType['aspect_ratio_mobile'] = 'original',
): ImageComponentType =>
  ({
    image_desktop: desktopImageUrl
      ? createFileAsset(desktopImageUrl)
      : undefined,
    image_mobile: mobileImageUrl ? createFileAsset(mobileImageUrl) : undefined,
    alt_text,
    aspect_ratio_desktop,
    aspect_ratio_mobile,
    _content_type_uid: 'image-component',
    uid: 'story-uid',
    title: 'Image',
  }) as unknown as ImageComponentType

const desktopImageUrl = 'desktopImage.avif'
const mobileImageUrl = 'mobileImage.avif'

/**
 * Contentstack Image component displays responsive images with support for different aspect ratios
 * on desktop and mobile devices. Uses Contentstack File assets with proper fallback handling.
 */
export default {
  title: 'CMS Contentstack/Image',
  component: ImageComponent,
  argTypes: {
    desktopImageUrl: {
      control: 'text',
      description: 'Desktop image URL',
      name: 'contentElement.image_desktop.url',
    },
    mobileImageUrl: {
      control: 'text',
      description: 'Mobile image URL (optional)',
      name: 'contentElement.image_mobile.url',
    },
    alt_text: {
      control: 'text',
      description: 'Alternative text for accessibility',
      name: 'contentElement.alt_text',
    },
    aspect_ratio_desktop: {
      control: 'select',
      options: ['', 'original', '1:1', '16:9', '3:4'],
      description: 'Aspect ratio for desktop display',
      name: 'contentElement.aspect_ratio_desktop',
    },
    aspect_ratio_mobile: {
      control: 'select',
      options: ['', 'original', '1:1', '16:9', '4:3'],
      description: 'Aspect ratio for mobile display',
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
      const contentElement = computed(() =>
        createContentElement(
          args.desktopImageUrl,
          args.mobileImageUrl,
          args.alt_text,
          args.aspect_ratio_desktop,
          args.aspect_ratio_mobile,
        ),
      )
      return { contentElement }
    },
    template: `
      <div class="mx-auto w-1/2">
        <ImageComponent :content-element="contentElement" />
      </div>
    `,
  }),
}

export const Default = {
  args: {
    desktopImageUrl,
    mobileImageUrl,
    alt_text: 'Original aspect ratio demo',
    aspect_ratio_desktop: 'original',
    aspect_ratio_mobile: 'original',
  },
}

/** Desktop-only image with 16:9 aspect ratio */
export const DesktopWidescreen = {
  args: {
    desktopImageUrl,
    mobileImageUrl: '',
    alt_text: 'Hero image in widescreen format',
    aspect_ratio_desktop: '16:9',
    aspect_ratio_mobile: '16:9',
  },
}

/** Square image with 1:1 aspect ratio */
export const SquareImage = {
  args: {
    desktopImageUrl,
    mobileImageUrl,
    alt_text: 'Profile photo in square format',
    aspect_ratio_desktop: '1:1',
    aspect_ratio_mobile: '1:1',
  },
}

/** Standard image with 3:4 aspect ratio on desktop */
export const PortraitRatio = {
  args: {
    desktopImageUrl,
    mobileImageUrl,
    alt_text: 'Product photo in portrait 3:4 format',
    aspect_ratio_desktop: '3:4',
    aspect_ratio_mobile: '4:3',
  },
}

/** Image with original aspect ratio preserved */
export const OriginalRatio = {
  args: {
    desktopImageUrl,
    mobileImageUrl,
    alt_text: 'Image with natural aspect ratio preserved',
    aspect_ratio_desktop: 'original',
    aspect_ratio_mobile: 'original',
  },
}

/** Image without mobile variant (desktop image used as fallback) */
export const DesktopOnly = {
  args: {
    desktopImageUrl,
    mobileImageUrl: '',
    alt_text: 'Banner image (desktop only)',
    aspect_ratio_desktop: '16:9',
    aspect_ratio_mobile: '16:9',
  },
}

/** Different aspect ratios for desktop and mobile */
export const MixedAspectRatios = {
  args: {
    desktopImageUrl,
    mobileImageUrl,
    alt_text: 'Mixed aspect ratios - 16:9 desktop, 1:1 mobile',
    aspect_ratio_desktop: '16:9',
    aspect_ratio_mobile: '1:1',
  },
}
