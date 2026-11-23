import { computed } from 'vue'
import type {
  SectionComponent as SectionComponentType,
  StoryblokAsset,
} from '@shared/types/cms/storyblok'
import SectionComponent from './SectionComponent.vue'

interface SectionStoryArgs {
  padding: SectionComponentType['padding']
  backgroundColor: string
  backgroundImageDesktopUrl: string
  backgroundImageMobileUrl: string
  minHeightDesktop: string
  minHeightMobile: string
  horizontalContentAlignment: SectionComponentType['horizontalContentAlignment']
  verticalContentAlignment: SectionComponentType['verticalContentAlignment']
  content: SectionComponentType['content']
}

const mockTextContent = {
  component: 'TextComponent' as const,
  _uid: 'text-content-1',
  content: 'This is section content rendered inside a section block.',
  textType: 'p' as const,
}

const mockDivider = {
  component: 'DividerComponent' as const,
  _uid: 'divider-1',
  height: 'small' as const,
  showLine: true,
}

const createContentElement = (
  args: SectionStoryArgs,
): SectionComponentType => ({
  padding: args.padding,
  backgroundColor: args.backgroundColor,
  backgroundImageDesktop: args.backgroundImageDesktopUrl
    ? ({
        filename: args.backgroundImageDesktopUrl,
        meta_data: { size: '1920x1080' },
      } as unknown as StoryblokAsset)
    : undefined,
  backgroundImageMobile: args.backgroundImageMobileUrl
    ? ({
        filename: args.backgroundImageMobileUrl,
        meta_data: { size: '768x1024' },
      } as unknown as StoryblokAsset)
    : undefined,
  minHeightDesktop: args.minHeightDesktop,
  minHeightMobile: args.minHeightMobile,
  horizontalContentAlignment: args.horizontalContentAlignment,
  verticalContentAlignment: args.verticalContentAlignment,
  content: args.content,
  component: 'SectionComponent',
  _uid: 'story-uid',
})

/**
 * Storyblok Section component is the primary layout container for CMS content.
 * Supports background colors, images, padding, and vertical/horizontal content alignment.
 */
export default {
  title: 'CMS Storyblok/Section',
  component: SectionComponent,
  argTypes: {
    padding: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Inner padding of the section',
      name: 'contentElement.padding',
    },
    backgroundColor: {
      control: 'color',
      description: 'Background color of the section',
      name: 'contentElement.backgroundColor',
    },
    backgroundImageDesktopUrl: {
      control: 'text',
      description: 'Desktop background image URL',
      name: 'contentElement.backgroundImageDesktop.filename',
    },
    backgroundImageMobileUrl: {
      control: 'text',
      description: 'Mobile background image URL',
      name: 'contentElement.backgroundImageMobile.filename',
    },
    minHeightDesktop: {
      control: 'text',
      description: 'Minimum height on desktop (px)',
      name: 'contentElement.minHeightDesktop',
    },
    minHeightMobile: {
      control: 'text',
      description: 'Minimum height on mobile (px)',
      name: 'contentElement.minHeightMobile',
    },
    horizontalContentAlignment: {
      control: 'select',
      options: ['', 'Left', 'Center', 'Right'],
      description: 'Horizontal content alignment',
      name: 'contentElement.horizontalContentAlignment',
    },
    verticalContentAlignment: {
      control: 'select',
      options: ['', 'Top', 'Middle', 'Bottom'],
      description: 'Vertical content alignment',
      name: 'contentElement.verticalContentAlignment',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<SectionComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: SectionStoryArgs) => ({
    components: { SectionComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template: '<SectionComponent :content-element="contentElement" />',
  }),
}

export const Default = {
  args: {
    padding: 'medium',
    backgroundColor: '',
    backgroundImageDesktopUrl: '',
    backgroundImageMobileUrl: '',
    minHeightDesktop: '',
    minHeightMobile: '',
    horizontalContentAlignment: 'Center',
    verticalContentAlignment: 'Middle',
    content: [mockTextContent],
  },
}

/** Section with a solid background color */
export const WithBackgroundColor = {
  args: {
    padding: 'medium',
    backgroundColor: '#e0f2fe',
    backgroundImageDesktopUrl: '',
    backgroundImageMobileUrl: '',
    minHeightDesktop: '300',
    minHeightMobile: '200',
    horizontalContentAlignment: 'Center',
    verticalContentAlignment: 'Middle',
    content: [mockTextContent],
  },
}

/** Section with a background image */
export const WithBackgroundImage = {
  args: {
    padding: 'large',
    backgroundColor: '',
    backgroundImageDesktopUrl: 'desktopImage.avif',
    backgroundImageMobileUrl: '',
    minHeightDesktop: '400',
    minHeightMobile: '300',
    horizontalContentAlignment: 'Center',
    verticalContentAlignment: 'Middle',
    content: [mockTextContent],
  },
}

/** Section with responsive background images for desktop and mobile */
export const WithResponsiveBackgroundImages = {
  args: {
    padding: 'large',
    backgroundColor: '',
    backgroundImageDesktopUrl: 'desktopImage.avif',
    backgroundImageMobileUrl: 'mobileImage.avif',
    minHeightDesktop: '400',
    minHeightMobile: '300',
    horizontalContentAlignment: 'Center',
    verticalContentAlignment: 'Middle',
    content: [mockTextContent],
  },
}

export const SmallPadding = {
  args: {
    padding: 'small',
    backgroundColor: '#f0fdf4',
    content: [mockTextContent],
  },
}

export const MediumPadding = {
  args: {
    padding: 'medium',
    backgroundColor: '#fef3c7',
    content: [mockTextContent],
  },
}

export const LargePadding = {
  args: {
    padding: 'large',
    backgroundColor: '#fce7f3',
    content: [mockTextContent],
  },
}

export const NoPadding = {
  args: {
    padding: 'none',
    backgroundColor: '#e0e7ff',
    content: [mockTextContent],
  },
}

/** Section with multiple nested content blocks */
export const WithMultipleChildren = {
  args: {
    padding: 'medium',
    backgroundColor: '#f8fafc',
    content: [
      {
        component: 'TextComponent' as const,
        _uid: 'text-1',
        content: 'First Content Block',
        textType: 'h2' as const,
      },
      mockDivider,
      {
        component: 'TextComponent' as const,
        _uid: 'text-2',
        content: 'Second content block with body text below the divider.',
        textType: 'p' as const,
      },
    ],
  },
}

/** Empty section with minimum height */
export const Empty = {
  args: {
    padding: 'medium',
    backgroundColor: '#f1f5f9',
    minHeightDesktop: '200',
    minHeightMobile: '150',
    content: [],
  },
}
