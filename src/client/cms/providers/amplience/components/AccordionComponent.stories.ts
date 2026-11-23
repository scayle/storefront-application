import { computed } from 'vue'
import type { AccordionComponent as AccordionComponentType } from '@shared/types/cms/amplience'
import AccordionComponent from './AccordionComponent.vue'

interface AccordionStoryArgs {
  title: string
  items: { title: string; body: string }[]
}

const textBlock = (content: string) => ({
  componentType: 'text',
  text: {
    content,
    textType: 'p',
    _meta: { schema: 'https://scayle.com/schemas/text-component.json' },
  },
})

const createContentElement = (
  args: AccordionStoryArgs,
): AccordionComponentType =>
  ({
    title: args.title,
    content: args.items.map((item) => ({
      title: item.title,
      content: [textBlock(item.body)],
      _meta: {
        schema: 'https://scayle.com/schemas/accordion-item-component.json',
      },
    })),
    _meta: { schema: 'https://scayle.com/schemas/accordion-component.json' },
  }) as unknown as AccordionComponentType

/**
 * Amplience Accordion component groups expandable items, for FAQs or product
 * information that would otherwise take too much vertical space.
 *
 * Unlike the other Amplience blocks, accordion children are stored as bare
 * `AccordionItemComponent` payloads rather than discriminated envelopes, so they
 * render directly instead of going through the block dispatcher.
 */
export default {
  title: 'CMS Amplience/Accordion',
  component: AccordionComponent,
  argTypes: {
    title: {
      control: 'text',
      description: 'Heading shown above the accordion items',
      name: 'contentElement.title',
    },
    items: {
      control: 'object',
      description: 'Accordion items, each with a title and body copy',
      name: 'contentElement.content',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<AccordionComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: AccordionStoryArgs) => ({
    components: { AccordionComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template: '<AccordionComponent :content-element="contentElement" />',
  }),
}

/** A typical FAQ grouping */
export const FrequentlyAskedQuestions = {
  args: {
    title: 'Frequently asked questions',
    items: [
      {
        title: 'How long does delivery take?',
        body: 'Orders placed before 2pm ship the same day and arrive within two to four working days.',
      },
      {
        title: 'Can I return an item?',
        body: 'You have 30 days to return any unworn item in its original packaging.',
      },
      {
        title: 'Do you ship internationally?',
        body: 'We ship to all EU countries, plus the UK, Switzerland, and Norway.',
      },
    ],
  },
}

/** Without a heading, the items stand on their own */
export const WithoutTitle = {
  args: {
    title: '',
    items: [
      {
        title: 'Material and care',
        body: '100% organic cotton. Machine wash at 30 degrees, do not tumble dry.',
      },
      {
        title: 'Fit',
        body: 'Regular fit. The model is 1.80m and wears size M.',
      },
    ],
  },
}

/** A single item, the smallest useful configuration */
export const SingleItem = {
  args: {
    title: 'Product details',
    items: [
      {
        title: 'Composition',
        body: 'Outer: 80% wool, 20% polyamide. Lining: 100% viscose.',
      },
    ],
  },
}
