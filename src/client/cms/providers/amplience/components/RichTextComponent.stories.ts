import { computed } from 'vue'
import type { RichTextComponent as RichTextComponentType } from '@shared/types/cms/amplience'
import RichTextComponent from './RichTextComponent.vue'

interface RichTextStoryArgs {
  content: string
}

const createContentElement = (content: string): RichTextComponentType => ({
  content,
  _meta: { schema: 'https://scayle.com/schemas/rich-text-component.json' },
})

/**
 * Amplience Rich Text component renders the provider's native markdown field.
 * Headings, paragraphs, and lists pick up the storefront type hierarchy, internal
 * links are localized, and external links open in a new tab. The HTML is
 * sanitized before rendering, so author-controlled markup cannot inject scripts.
 *
 * Amplience's editor has no markdown syntax for underline, so it emits raw `<u>`
 * tags. Those survive rendering and sanitization.
 */
export default {
  title: 'CMS Amplience/RichText',
  component: RichTextComponent,
  argTypes: {
    content: {
      control: 'text',
      description: 'Markdown content authored in Amplience',
      name: 'contentElement.content',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<RichTextComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: RichTextStoryArgs) => ({
    components: { RichTextComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args.content))
      return { contentElement }
    },
    template: '<RichTextComponent :content-element="contentElement" />',
  }),
}

/** Body copy with inline emphasis */
export const Paragraphs = {
  args: {
    content:
      'Our materials are chosen for durability and comfort.\n\nEvery piece is made to be **worn often** and kept for *years*.',
  },
}

/** Headings pick up the storefront type hierarchy */
export const Headings = {
  args: {
    content:
      '# Shipping and returns\n\n## Delivery times\n\nOrders placed before 2pm ship the same day.\n\n### Returns window\n\nYou have 30 days to return an unworn item.',
  },
}

export const Lists = {
  args: {
    content:
      'What is included:\n\n- Free delivery over 50 EUR\n- 30 day returns\n- Two year warranty\n\nHow to return an item:\n\n1. Open your order history\n2. Pick the item\n3. Print the label',
  },
}

/** Internal links are localized; absolute URLs open in a new tab */
export const Links = {
  args: {
    content:
      'Read our [size guide](/content/size-guide) before ordering, or visit [SCAYLE](https://scayle.com) to learn more about the platform.',
  },
}

/** Amplience emits raw `<u>` tags, which markdown has no syntax for */
export const Underline = {
  args: {
    content: 'Sale ends <u>this Sunday</u> at midnight.',
  },
}
