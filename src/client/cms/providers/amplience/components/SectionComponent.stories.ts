import { computed } from 'vue'
import type { SectionComponent as SectionComponentType } from '@shared/types/cms/amplience'
import SectionComponent from './SectionComponent.vue'

interface SectionStoryArgs {
  headline: string
  body: string
  padding: SectionComponentType['padding']
  backgroundColor: string
  backgroundImageName: string
  minHeightDesktop: number
  minHeightMobile: number
  horizontalContentAlignment: 'Left' | 'Center' | 'Right'
  verticalContentAlignment: 'Top' | 'Middle' | 'Bottom'
}

const textBlock = (content: string, textType: 'h2' | 'p') => ({
  componentType: 'text',
  text: {
    content,
    textType,
    _meta: { schema: 'https://scayle.com/schemas/text-component.json' },
  },
})

const createContentElement = (args: SectionStoryArgs): SectionComponentType =>
  ({
    content: [
      ...(args.headline ? [textBlock(args.headline, 'h2')] : []),
      ...(args.body ? [textBlock(args.body, 'p')] : []),
    ],
    padding: args.padding,
    background_color: args.backgroundColor || undefined,
    background_image_desktop: args.backgroundImageName
      ? {
          id: args.backgroundImageName,
          name: args.backgroundImageName,
          endpoint: 'scayle',
          defaultHost: 'cdn.media.amplience.net',
        }
      : undefined,
    min_height_desktop: args.minHeightDesktop,
    min_height_mobile: args.minHeightMobile,
    horizontal_content_alignment: args.horizontalContentAlignment,
    vertical_content_alignment: args.verticalContentAlignment,
    _meta: { schema: 'https://scayle.com/schemas/section-component.json' },
  }) as unknown as SectionComponentType

/**
 * Amplience Section component is the general-purpose container: it groups nested
 * blocks and can carry a background color, a background image, padding, a minimum
 * height, and content alignment.
 *
 * A section with a background image takes part in the page's LCP priority claim,
 * because a hero background is often the largest paint. Sections without one opt
 * out so they do not consume a position from a later image.
 */
export default {
  title: 'CMS Amplience/Section',
  component: SectionComponent,
  argTypes: {
    headline: {
      control: 'text',
      description: 'Optional heading rendered as a nested text block',
    },
    body: {
      control: 'text',
      description: 'Optional body copy rendered as a nested text block',
    },
    padding: {
      control: 'select',
      options: ['none', 'small', 'medium', 'large'],
      description: 'Space inside the section around its content',
      name: 'contentElement.padding',
    },
    backgroundColor: {
      control: 'color',
      description: 'Background color behind the section content',
      name: 'contentElement.background_color',
    },
    backgroundImageName: {
      control: 'text',
      description:
        'Dynamic Media asset name for the background image. Leave empty for no image.',
      name: 'contentElement.background_image_desktop.name',
    },
    minHeightDesktop: {
      control: 'number',
      description: 'Minimum section height on desktop, in pixels',
      name: 'contentElement.min_height_desktop',
    },
    minHeightMobile: {
      control: 'number',
      description:
        'Minimum section height on mobile, in pixels. Falls back to the desktop height.',
      name: 'contentElement.min_height_mobile',
    },
    horizontalContentAlignment: {
      control: 'select',
      options: ['Left', 'Center', 'Right'],
      description: 'Horizontal alignment of the section content',
      name: 'contentElement.horizontal_content_alignment',
    },
    verticalContentAlignment: {
      control: 'select',
      options: ['Top', 'Middle', 'Bottom'],
      description: 'Vertical alignment of the section content',
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

const baseArgs = {
  headline: 'Made to last',
  body: 'Durable materials, considered construction, and a two year warranty on every piece.',
  padding: 'medium',
  backgroundColor: '',
  backgroundImageName: '',
  minHeightDesktop: 0,
  minHeightMobile: 0,
  horizontalContentAlignment: 'Center',
  verticalContentAlignment: 'Middle',
}

/** Plain container with padding only */
export const Default = { args: baseArgs }

export const WithBackgroundColor = {
  args: { ...baseArgs, backgroundColor: '#f4f4f5', padding: 'large' },
}

/** A hero background image, which participates in the LCP priority claim */
export const WithBackgroundImage = {
  args: {
    ...baseArgs,
    backgroundImageName: 'section-hero',
    minHeightDesktop: 480,
    minHeightMobile: 320,
    padding: 'large',
  },
}

/** Content pinned to the top left of a tall section */
export const TopLeftAligned = {
  args: {
    ...baseArgs,
    minHeightDesktop: 400,
    minHeightMobile: 300,
    horizontalContentAlignment: 'Left',
    verticalContentAlignment: 'Top',
  },
}

/** Content pinned to the bottom, as in a campaign banner overlay */
export const BottomAligned = {
  args: {
    ...baseArgs,
    backgroundColor: '#e4e4e7',
    minHeightDesktop: 400,
    minHeightMobile: 300,
    verticalContentAlignment: 'Bottom',
  },
}
