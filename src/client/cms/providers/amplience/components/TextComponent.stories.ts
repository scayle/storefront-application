import { computed } from 'vue'
import type { TextComponent as TextComponentType } from '@shared/types/cms/amplience'
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
  _meta: { schema: 'https://scayle.com/schemas/text-component.json' },
})

/**
 * Amplience Text component displays short text content as a heading or paragraph.
 * The `textType` field selects the semantic element, and the storefront type
 * hierarchy supplies the matching class.
 */
export default {
  title: 'CMS Amplience/Text',
  component: TextComponent,
  argTypes: {
    content: {
      control: 'text',
      description: 'Text content to display',
      name: 'contentElement.content',
    },
    textType: {
      control: 'select',
      options: ['p', 'h1', 'h2', 'h3', 'h4'],
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

/** Main heading (H1) with page-level styling */
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
