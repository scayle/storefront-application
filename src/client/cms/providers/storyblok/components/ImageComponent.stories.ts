import { computed } from 'vue'
import type {
  ImageComponent as ImageComponentType,
  StoryblokAsset,
} from '@shared/types/cms/storyblok'
import ImageComponent from './ImageComponent.vue'

interface ImageStoryArgs {
  desktopImageUrl: string
  mobileImageUrl: string
  altText: string
  aspectRatioDesktop: ImageComponentType['aspectRatioDesktop']
  aspectRatioMobile: ImageComponentType['aspectRatioMobile']
}

const createContentElement = (
  desktopImageUrl: string,
  mobileImageUrl: string,
  altText: string,
  aspectRatioDesktop: ImageComponentType['aspectRatioDesktop'] = 'original',
  aspectRatioMobile: ImageComponentType['aspectRatioMobile'] = 'original',
): ImageComponentType => ({
  imageDesktop: desktopImageUrl
    ? ({
        filename: desktopImageUrl,
        meta_data: { size: '1280x1455' },
      } as unknown as StoryblokAsset)
    : undefined,
  imageMobile: mobileImageUrl
    ? ({
        filename: mobileImageUrl,
        meta_data: { size: '1280x1455' },
      } as unknown as StoryblokAsset)
    : undefined,
  altText,
  aspectRatioDesktop,
  aspectRatioMobile,
  component: 'ImageComponent',
  _uid: 'story-uid',
})

const desktopImageUrl = 'desktopImage.avif'
const mobileImageUrl = 'mobileImage.avif'

/**
 * Storyblok Image component displays responsive images with support for different aspect ratios
 * on desktop and mobile devices. Uses Storyblok assets with proper fallback handling.
 */
export default {
  title: 'CMS Storyblok/Image',
  component: ImageComponent,
  argTypes: {
    desktopImageUrl: {
      control: 'text',
      description: 'Desktop image URL',
      name: 'contentElement.imageDesktop.filename',
    },
    mobileImageUrl: {
      control: 'text',
      description: 'Mobile image URL (optional)',
      name: 'contentElement.imageMobile.filename',
    },
    altText: {
      control: 'text',
      description: 'Alternative text for accessibility',
      name: 'contentElement.altText',
    },
    aspectRatioDesktop: {
      control: 'select',
      options: ['', 'original', '1:1', '16:9', '4:3'],
      description: 'Aspect ratio for desktop display',
      name: 'contentElement.aspectRatioDesktop',
    },
    aspectRatioMobile: {
      control: 'select',
      options: ['', 'original', '1:1', '16:9', '4:3'],
      description: 'Aspect ratio for mobile display',
      name: 'contentElement.aspectRatioMobile',
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
          args.altText,
          args.aspectRatioDesktop,
          args.aspectRatioMobile,
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
    altText: 'Original aspect ratio demo',
    aspectRatioDesktop: 'original',
    aspectRatioMobile: 'original',
  },
}

/** Desktop-only image with 16:9 aspect ratio */
export const DesktopWidescreen = {
  args: {
    desktopImageUrl,
    mobileImageUrl: '',
    altText: 'Hero image in widescreen format',
    aspectRatioDesktop: '16:9',
    aspectRatioMobile: '16:9',
  },
}

/** Square image with 1:1 aspect ratio */
export const SquareImage = {
  args: {
    desktopImageUrl,
    mobileImageUrl,
    altText: 'Profile photo in square format',
    aspectRatioDesktop: '1:1',
    aspectRatioMobile: '1:1',
  },
}

/** Standard image with 4:3 aspect ratio */
export const StandardRatio = {
  args: {
    desktopImageUrl,
    mobileImageUrl,
    altText: 'Product photo in standard 4:3 format',
    aspectRatioDesktop: '4:3',
    aspectRatioMobile: '4:3',
  },
}

/** Image with original aspect ratio preserved */
export const OriginalRatio = {
  args: {
    desktopImageUrl,
    mobileImageUrl,
    altText: 'Image with natural aspect ratio preserved',
    aspectRatioDesktop: 'original',
    aspectRatioMobile: 'original',
  },
}

/** Image without mobile variant (desktop image used as fallback) */
export const DesktopOnly = {
  args: {
    desktopImageUrl,
    mobileImageUrl: '',
    altText: 'Banner image (desktop only)',
    aspectRatioDesktop: '16:9',
    aspectRatioMobile: '16:9',
  },
}

/** Different aspect ratios for desktop and mobile */
export const MixedAspectRatios = {
  args: {
    desktopImageUrl,
    mobileImageUrl,
    altText: 'Mixed aspect ratios - 16:9 desktop, 1:1 mobile',
    aspectRatioDesktop: '16:9',
    aspectRatioMobile: '1:1',
  },
}
