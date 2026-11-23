import { computed } from 'vue'
import type {
  SectionComponent as SectionComponentType,
  File,
} from '@shared/types/cms/contentstack'
import SectionComponent from './SectionComponent.vue'

interface SectionStoryArgs {
  padding: SectionComponentType['padding']
  background_color: string
  backgroundImageDesktopUrl: string
  backgroundImageMobileUrl: string
  min_height_desktop: number
  min_height_mobile: number
  horizontal_content_alignment: SectionComponentType['horizontal_content_alignment']
  vertical_content_alignment: SectionComponentType['vertical_content_alignment']
  content: SectionComponentType['content']
}

const mockTextContent = {
  _content_type_uid: 'text-component' as const,
  uid: 'text-content-1',
  title: 'Text',
  content: 'This is section content rendered inside a section block.',
  text_type: 'p' as const,
}

const mockDivider = {
  _content_type_uid: 'divider-component' as const,
  uid: 'divider-1',
  title: 'Divider',
  height: 'small' as const,
  show_line: true,
}

const createFileAsset = (url: string): File =>
  ({
    url,
    dimension: { width: 1920, height: 1080 },
  }) as unknown as File

const createContentElement = (args: SectionStoryArgs): SectionComponentType =>
  ({
    padding: args.padding,
    background_color: args.background_color,
    background_image_desktop: args.backgroundImageDesktopUrl
      ? createFileAsset(args.backgroundImageDesktopUrl)
      : undefined,
    background_image_mobile: args.backgroundImageMobileUrl
      ? createFileAsset(args.backgroundImageMobileUrl)
      : undefined,
    min_height_desktop: args.min_height_desktop,
    min_height_mobile: args.min_height_mobile,
    horizontal_content_alignment: args.horizontal_content_alignment,
    vertical_content_alignment: args.vertical_content_alignment,
    content: args.content,
    _content_type_uid: 'section-component',
    uid: 'story-uid',
    title: 'Section',
  }) as unknown as SectionComponentType

/**
 * Contentstack Section component is the primary layout container for CMS content.
 * Supports background colors, images, padding, and vertical/horizontal content alignment.
 */
export default {
  title: 'CMS Contentstack/Section',
  component: SectionComponent,
  argTypes: {
    padding: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Inner padding of the section',
      name: 'contentElement.padding',
    },
    background_color: {
      control: 'color',
      description: 'Background color of the section',
      name: 'contentElement.background_color',
    },
    backgroundImageDesktopUrl: {
      control: 'text',
      description: 'Desktop background image URL',
      name: 'contentElement.background_image_desktop.url',
    },
    backgroundImageMobileUrl: {
      control: 'text',
      description: 'Mobile background image URL',
      name: 'contentElement.background_image_mobile.url',
    },
    min_height_desktop: {
      control: 'number',
      description: 'Minimum height on desktop (px)',
      name: 'contentElement.min_height_desktop',
    },
    min_height_mobile: {
      control: 'number',
      description: 'Minimum height on mobile (px)',
      name: 'contentElement.min_height_mobile',
    },
    horizontal_content_alignment: {
      control: 'select',
      options: ['', 'Left', 'Center', 'Right'],
      description: 'Horizontal content alignment',
      name: 'contentElement.horizontal_content_alignment',
    },
    vertical_content_alignment: {
      control: 'select',
      options: ['', 'Top', 'Middle', 'Bottom'],
      description: 'Vertical content alignment',
      name: 'contentElement.vertical_content_alignment',
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
    background_color: '',
    backgroundImageDesktopUrl: '',
    backgroundImageMobileUrl: '',
    min_height_desktop: 0,
    min_height_mobile: 0,
    horizontal_content_alignment: 'Center',
    vertical_content_alignment: 'Middle',
    content: [mockTextContent],
  },
}

/** Section with a solid background color */
export const WithBackgroundColor = {
  args: {
    padding: 'medium',
    background_color: '#e0f2fe',
    backgroundImageDesktopUrl: '',
    backgroundImageMobileUrl: '',
    min_height_desktop: 300,
    min_height_mobile: 200,
    horizontal_content_alignment: 'Center',
    vertical_content_alignment: 'Middle',
    content: [mockTextContent],
  },
}

/** Section with a background image */
export const WithBackgroundImage = {
  args: {
    padding: 'large',
    background_color: '',
    backgroundImageDesktopUrl: 'desktopImage.avif',
    backgroundImageMobileUrl: '',
    min_height_desktop: 400,
    min_height_mobile: 300,
    horizontal_content_alignment: 'Center',
    vertical_content_alignment: 'Middle',
    content: [mockTextContent],
  },
}

/** Section with responsive background images for desktop and mobile */
export const WithResponsiveBackgroundImages = {
  args: {
    padding: 'large',
    background_color: '',
    backgroundImageDesktopUrl: 'desktopImage.avif',
    backgroundImageMobileUrl: 'mobileImage.avif',
    min_height_desktop: 400,
    min_height_mobile: 300,
    horizontal_content_alignment: 'Center',
    vertical_content_alignment: 'Middle',
    content: [mockTextContent],
  },
}

export const SmallPadding = {
  args: {
    padding: 'small',
    background_color: '#f0fdf4',
    content: [mockTextContent],
  },
}

export const MediumPadding = {
  args: {
    padding: 'medium',
    background_color: '#fef3c7',
    content: [mockTextContent],
  },
}

export const LargePadding = {
  args: {
    padding: 'large',
    background_color: '#fce7f3',
    content: [mockTextContent],
  },
}

export const NoPadding = {
  args: {
    padding: 'none',
    background_color: '#e0e7ff',
    content: [mockTextContent],
  },
}

/** Section with multiple nested content blocks */
export const WithMultipleChildren = {
  args: {
    padding: 'medium',
    background_color: '#f8fafc',
    content: [
      {
        _content_type_uid: 'text-component' as const,
        uid: 'text-1',
        title: 'Heading',
        content: 'First Content Block',
        text_type: 'h2' as const,
      },
      mockDivider,
      {
        _content_type_uid: 'text-component' as const,
        uid: 'text-2',
        title: 'Body',
        content: 'Second content block with body text below the divider.',
        text_type: 'p' as const,
      },
    ],
  },
}

/** Empty section with minimum height */
export const Empty = {
  args: {
    padding: 'medium',
    background_color: '#f1f5f9',
    min_height_desktop: 200,
    min_height_mobile: 150,
    content: [],
  },
}
