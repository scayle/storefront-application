import { computed } from 'vue'
import type {
  AccordionComponent as AccordionComponentType,
  AccordionItemComponent as AccordionItemComponentType,
} from '@shared/types/cms/contentstack'
import AccordionComponent from './AccordionComponent.vue'

interface AccordionStoryArgs {
  display_title?: string
  content: AccordionComponentType['content']
}

const createContentElement = (
  display_title?: string,
  content: AccordionComponentType['content'] = [],
): AccordionComponentType =>
  ({
    display_title,
    content,
    _content_type_uid: 'accordion-component',
    uid: 'story-uid',
    title: 'Accordion',
  }) as AccordionComponentType

const mockAccordionItem1 = {
  _content_type_uid: 'accordion_item-component',
  uid: 'accordion-item-1',
  title: 'Shipping Information',
  display_title: 'Shipping Information',
  content: [
    {
      _content_type_uid: 'section-component',
      uid: 'section-1',
      title: 'Section',
      background_color: '#f0f9ff',
      padding: 'medium',
      content: [
        {
          _content_type_uid: 'text-component',
          uid: 'text-1',
          title: 'Text',
          content:
            'We offer free shipping on orders over $50. Standard shipping takes 3-5 business days, while express shipping delivers within 1-2 business days.',
          text_type: 'p',
        },
      ],
    },
  ],
} as unknown as AccordionItemComponentType

const mockAccordionItem2 = {
  _content_type_uid: 'accordion_item-component',
  uid: 'accordion-item-2',
  title: 'Return Policy',
  display_title: 'Return Policy',
  content: [
    {
      _content_type_uid: 'section-component',
      uid: 'section-2',
      title: 'Section',
      background_color: '#fef3c7',
      padding: 'medium',
      content: [
        {
          _content_type_uid: 'text-component',
          uid: 'text-2',
          title: 'Text',
          content:
            'Returns are accepted within 30 days of purchase. Items must be unused and in original packaging. Return shipping costs are covered by the customer.',
          text_type: 'p',
        },
      ],
    },
  ],
} as unknown as AccordionItemComponentType

const mockAccordionItem3 = {
  _content_type_uid: 'accordion_item-component',
  uid: 'accordion-item-3',
  title: 'Product Care',
  display_title: 'Product Care',
  content: [
    {
      _content_type_uid: 'section-component',
      uid: 'section-3',
      title: 'Section',
      background_color: '#f0fdf4',
      padding: 'medium',
      content: [
        {
          _content_type_uid: 'text-component',
          uid: 'text-3',
          title: 'Text',
          content:
            'Machine wash cold with like colors. Do not bleach. Tumble dry low. Iron on medium heat if needed. Do not dry clean.',
          text_type: 'p',
        },
      ],
    },
  ],
} as unknown as AccordionItemComponentType

/**
 * Contentstack Accordion component displays a collapsible container with a title and multiple accordion items.
 * Renders accordion entries using AccordionItemComponent instances with expandable/collapsible behavior.
 */
export default {
  title: 'CMS Contentstack/Accordion',
  component: AccordionComponent,
  argTypes: {
    display_title: {
      control: 'text',
      description: 'Optional title displayed above accordion items',
      name: 'contentElement.display_title',
    },
    content: {
      control: 'object',
      description: 'Array of accordion items to display',
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
      const contentElement = computed(() =>
        createContentElement(args.display_title, args.content),
      )
      return { contentElement }
    },
    template: `
      <div class="w-full max-w-160">
        <AccordionComponent :content-element="contentElement" />
      </div>
    `,
  }),
}

/** Accordion with title and multiple items */
export const WithTitle = {
  args: {
    display_title: 'Product FAQ',
    content: [
      mockAccordionItem1,
      mockAccordionItem2,
      mockAccordionItem3,
    ] as AccordionComponentType['content'],
  },
}

/** Accordion without title, just the collapsible items */
export const WithoutTitle = {
  args: {
    content: [
      mockAccordionItem1,
      mockAccordionItem2,
    ] as AccordionComponentType['content'],
  },
}

/** Single accordion item */
export const SingleItem = {
  args: {
    display_title: 'Contact Information',
    content: [mockAccordionItem1] as AccordionComponentType['content'],
  },
}
