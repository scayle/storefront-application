import { computed } from 'vue'
import type {
  TypeAccordionComponentWithoutUnresolvableLinksResponse,
  TypeAccordionItemComponentWithoutUnresolvableLinksResponse,
} from '@shared/types/cms/contentful'
import AccordionComponent from './AccordionComponent.vue'

interface AccordionStoryArgs {
  title?: string
  content: TypeAccordionComponentWithoutUnresolvableLinksResponse['fields']['content']
}

const createContentElement = (
  title?: string,
  content: unknown[] = [],
): TypeAccordionComponentWithoutUnresolvableLinksResponse =>
  ({
    fields: {
      title,
      content,
    },
  }) as TypeAccordionComponentWithoutUnresolvableLinksResponse

/**
 * Contentful Accordion component displays a collapsible container with a title and multiple accordion items.
 * Renders accordion entries using AccordionItemComponent instances with expandable/collapsible behavior.
 */
export default {
  title: 'CMS Contentful/Accordion',
  component: AccordionComponent,
  argTypes: {
    title: {
      control: 'text',
      description: 'Optional title displayed above accordion items',
      name: 'contentElement.fields.title',
    },
    content: {
      control: 'object',
      description: 'Array of accordion items to display',
      name: 'contentElement.fields.content',
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
        createContentElement(args.title, args.content),
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

const mockAccordionItem1 = {
  sys: {
    id: 'accordion-item-1',
    contentType: { sys: { id: 'AccordionItemComponent' } },
  },
  fields: {
    title: 'Shipping Information',
    content: [
      {
        sys: {
          id: 'section-1',
          contentType: { sys: { id: 'SectionComponent' } },
        },
        fields: {
          backgroundColor: '#f0f9ff',
          padding: 'medium',
          content: [
            {
              sys: {
                id: 'text-1',
                contentType: { sys: { id: 'TextComponent' } },
              },
              fields: {
                content:
                  'We offer free shipping on orders over $50. Standard shipping takes 3-5 business days, while express shipping delivers within 1-2 business days.',
                textType: 'p',
              },
            },
          ],
        },
      },
    ],
  },
} as unknown as TypeAccordionItemComponentWithoutUnresolvableLinksResponse

const mockAccordionItem2 = {
  sys: {
    id: 'accordion-item-2',
    contentType: { sys: { id: 'AccordionItemComponent' } },
  },
  fields: {
    title: 'Return Policy',
    content: [
      {
        sys: {
          id: 'section-2',
          contentType: { sys: { id: 'SectionComponent' } },
        },
        fields: {
          backgroundColor: '#fef3c7',
          padding: 'medium',
          content: [
            {
              sys: {
                id: 'text-2',
                contentType: { sys: { id: 'TextComponent' } },
              },
              fields: {
                content:
                  'Returns are accepted within 30 days of purchase. Items must be unused and in original packaging. Return shipping costs are covered by the customer.',
                textType: 'p',
              },
            },
          ],
        },
      },
    ],
  },
} as unknown as TypeAccordionItemComponentWithoutUnresolvableLinksResponse

const mockAccordionItem3 = {
  sys: {
    id: 'accordion-item-3',
    contentType: { sys: { id: 'AccordionItemComponent' } },
  },
  fields: {
    title: 'Product Care',
    content: [
      {
        sys: {
          id: 'section-3',
          contentType: { sys: { id: 'SectionComponent' } },
        },
        fields: {
          backgroundColor: '#f0fdf4',
          padding: 'medium',
          content: [
            {
              sys: {
                id: 'text-3',
                contentType: { sys: { id: 'TextComponent' } },
              },
              fields: {
                content:
                  'Machine wash cold with like colors. Do not bleach. Tumble dry low. Iron on medium heat if needed. Do not dry clean.',
                textType: 'p',
              },
            },
          ],
        },
      },
    ],
  },
} as unknown as TypeAccordionItemComponentWithoutUnresolvableLinksResponse

/** Accordion with title and multiple items */
export const WithTitle = {
  args: {
    title: 'Product FAQ',
    content: [mockAccordionItem1, mockAccordionItem2, mockAccordionItem3],
  },
}

/** Accordion without title, just the collapsible items */
export const WithoutTitle = {
  args: {
    content: [mockAccordionItem1, mockAccordionItem2],
  },
}

/** Single accordion item */
export const SingleItem = {
  args: {
    title: 'Contact Information',
    content: [mockAccordionItem1],
  },
}
