import { computed } from 'vue'
import type { TypeImageComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import ImageComponent from './ImageComponent.vue'

type AspectRatio = 'original' | '1:1' | '16:9' | '4:3'

interface ImageStoryArgs {
  desktopImageUrl: string
  mobileImageUrl: string
  altText: string
  aspectRatioDesktop: AspectRatio
  aspectRatioMobile: AspectRatio
}

const createContentElement = (
  desktopImageUrl: string,
  mobileImageUrl: string,
  altText: string,
  aspectRatioDesktop: AspectRatio = 'original',
  aspectRatioMobile: AspectRatio = 'original',
): TypeImageComponentWithoutUnresolvableLinksResponse =>
  ({
    fields: {
      imageDesktop: desktopImageUrl
        ? {
            fields: {
              file: {
                url: desktopImageUrl,
                details: {
                  image: {
                    width: 1280,
                    height: 1455,
                  },
                },
              },
            },
          }
        : undefined,
      imageMobile: mobileImageUrl
        ? {
            fields: {
              file: {
                url: mobileImageUrl,
                details: {
                  image: {
                    width: 1280,
                    height: 1455,
                  },
                },
              },
            },
          }
        : undefined,
      altText,
      aspectRatioDesktop,
      aspectRatioMobile,
    },
  }) as TypeImageComponentWithoutUnresolvableLinksResponse

/**
 * Contentful Image component displays responsive images with support for different
 * aspect ratios on desktop and mobile devices. Uses Contentful assets with proper fallback handling.
 */
export default {
  title: 'CMS Contentful/Image',
  component: ImageComponent,
  argTypes: {
    desktopImageUrl: {
      control: 'text',
      description: 'Desktop image URL',
      name: 'contentElement.fields.imageDesktop.fields.file.url',
    },
    mobileImageUrl: {
      control: 'text',
      description: 'Mobile image URL (optional)',
      name: 'contentElement.fields.imageMobile.fields.file.url',
    },
    altText: {
      control: 'text',
      description: 'Alternative text for accessibility',
      name: 'contentElement.fields.altText',
    },
    aspectRatioDesktop: {
      control: 'select',
      options: ['original', '1:1', '16:9', '4:3'],
      description: 'Aspect ratio for desktop display',
      name: 'contentElement.fields.aspectRatioDesktop',
    },
    aspectRatioMobile: {
      control: 'select',
      options: ['original', '1:1', '16:9', '4:3'],
      description: 'Aspect ratio for mobile display',
      name: 'contentElement.fields.aspectRatioMobile',
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
      <div class="w-1/2 mx-auto">
        <ImageComponent :content-element="contentElement" />
      </div>
    `,
  }),
}

const desktopImageUrl = 'desktopImage.avif'
const mobileImageUrl = 'mobileImage.avif'

/** Overview of all available aspect ratios and configurations */
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
    mobileImageUrl,
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
