import { computed } from 'vue'
import type { TextComponent as TextComponentType } from '@shared/types/cms/contentstack'
import TextComponent from './TextComponent.vue'

interface TextStoryArgs {
  content: string
  text_type: TextComponentType['text_type']
}

const createContentElement = (
  content: string,
  text_type: TextComponentType['text_type'] = 'p',
): TextComponentType => ({
  content,
  text_type,
  _content_type_uid: 'text-component',
  uid: 'story-uid',
  title: 'Text',
})

/**
 * Contentstack Text component displays text content with configurable HTML elements and styling.
 * Supports different text types (h1-h4, p) with appropriate semantic markup and Tailwind CSS classes.
 */
export default {
  title: 'CMS Contentstack/Text',
  component: TextComponent,
  argTypes: {
    content: {
      control: 'text',
      description: 'Text content to display',
      name: 'contentElement.content',
    },
    text_type: {
      control: 'select',
      options: ['', 'p', 'h1', 'h2', 'h3', 'h4'],
      description: 'HTML element type for semantic markup',
      name: 'contentElement.text_type',
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
        createContentElement(args.content, args.text_type),
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
    text_type: 'p',
  },
}

/** Main heading (H1) with large, bold styling */
export const Heading1 = {
  args: { content: 'Main Page Heading', text_type: 'h1' },
}

/** Section heading (H2) */
export const Heading2 = {
  args: { content: 'Section Heading', text_type: 'h2' },
}

/** Subsection heading (H3) */
export const Heading3 = {
  args: { content: 'Subsection Heading', text_type: 'h3' },
}

/** Minor heading (H4) */
export const Heading4 = {
  args: { content: 'Minor Heading', text_type: 'h4' },
}
