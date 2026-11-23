import { computed } from 'vue'
import type { TextComponent as TextComponentType } from '@shared/types/cms/storyblok'
import TextComponent from './TextComponent.vue'

interface TextStoryArgs {
  content: string
  textType: TextComponentType['textType']
}

const createContentElement = (
  content: string,
  textType: TextComponentType['textType'] = 'p',
): TextComponentType => ({
  content,
  textType,
  component: 'TextComponent',
  _uid: 'story-uid',
})

/**
 * Storyblok Text component displays text content with configurable HTML elements and styling.
 * Supports different text types (h1-h4, p) with appropriate semantic markup and Tailwind CSS classes.
 */
export default {
  title: 'CMS Storyblok/Text',
  component: TextComponent,
  argTypes: {
    content: {
      control: 'text',
      description: 'Text content to display',
      name: 'contentElement.content',
    },
    textType: {
      control: 'select',
      options: ['', 'p', 'h1', 'h2', 'h3', 'h4'],
      description: 'HTML element type for semantic markup',
      name: 'contentElement.textType',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<TextComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: TextStoryArgs) => ({
    components: { TextComponent },
    setup() {
      const contentElement = computed(() =>
        createContentElement(args.content, args.textType),
      )
      return { contentElement }
    },
    template: '<TextComponent :content-element="contentElement" />',
  }),
}

/** Default paragraph text */
export const Paragraph = {
  args: {
    content:
      'This is a paragraph of text that will be rendered as a <p> element.',
    textType: 'p',
  },
}

/** Main heading (H1) with large, bold styling */
export const Heading1 = {
  args: { content: 'Main Page Heading', textType: 'h1' },
}

/** Section heading (H2) */
export const Heading2 = {
  args: { content: 'Section Heading', textType: 'h2' },
}

/** Subsection heading (H3) */
export const Heading3 = {
  args: { content: 'Subsection Heading', textType: 'h3' },
}

/** Minor heading (H4) */
export const Heading4 = {
  args: { content: 'Minor Heading', textType: 'h4' },
}
