import { computed } from 'vue'
import type { AccordionItemComponent as AccordionItemComponentType } from '@shared/types/cms/amplience'
import AccordionItemComponent from './AccordionItemComponent.vue'

interface AccordionItemStoryArgs {
  title: string
  body: string
}

const createContentElement = (
  args: AccordionItemStoryArgs,
): AccordionItemComponentType =>
  ({
    title: args.title,
    content: [
      {
        componentType: 'text',
        text: {
          content: args.body,
          textType: 'p',
          _meta: { schema: 'https://scayle.com/schemas/text-component.json' },
        },
      },
    ],
    _meta: {
      schema: 'https://scayle.com/schemas/accordion-item-component.json',
    },
  }) as unknown as AccordionItemComponentType

/**
 * Amplience Accordion Item is a single expandable row inside an accordion. It is
 * normally authored as a child of the Accordion block rather than on its own, and
 * is shown here in isolation to document its collapsed and expanded states.
 *
 * Amplience gives nested blocks no unique id of their own, so the item generates
 * one to wire up its `aria-controls` relationship.
 */
export default {
  title: 'CMS Amplience/AccordionItem',
  component: AccordionItemComponent,
  argTypes: {
    title: {
      control: 'text',
      description: 'Row label users click to expand the item',
      name: 'contentElement.title',
    },
    body: {
      control: 'text',
      description: 'Copy revealed when the item is expanded',
      name: 'contentElement.content',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<AccordionItemComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: AccordionItemStoryArgs) => ({
    components: { AccordionItemComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template: '<AccordionItemComponent :content-element="contentElement" />',
  }),
}

export const Default = {
  args: {
    title: 'Material and care',
    body: '100% organic cotton. Machine wash at 30 degrees, do not tumble dry.',
  },
}

/** A longer body shows how the expanded row grows */
export const LongBody = {
  args: {
    title: 'Delivery and returns',
    body: 'Orders placed before 2pm ship the same day and arrive within two to four working days. You have 30 days to return any unworn item in its original packaging, and returns are free for members. Once we receive the item, refunds are issued to the original payment method within five working days.',
  },
}
