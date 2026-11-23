import { computed } from 'vue'
import type {
  TypeAccordionItemComponentWithoutUnresolvableLinksResponse,
  TypeSectionComponentWithoutUnresolvableLinksResponse,
} from '@shared/types/cms/contentful'
import AccordionItemComponent from './AccordionItemComponent.vue'

interface AccordionItemStoryArgs {
  title: string
  content: TypeAccordionItemComponentWithoutUnresolvableLinksResponse['fields']['content']
}

const createContentElement = (
  title = 'Default Title',
  content: TypeAccordionItemComponentWithoutUnresolvableLinksResponse['fields']['content'] = [],
): TypeAccordionItemComponentWithoutUnresolvableLinksResponse =>
  ({
    sys: {
      id: 'accordion-item-basic',
      contentType: { sys: { id: 'AccordionItemComponent' } },
    },
    fields: {
      title,
      content,
    },
  }) as unknown as TypeAccordionItemComponentWithoutUnresolvableLinksResponse

/**
 * Contentful AccordionItem component renders a single collapsible accordion entry with a title and content.
 * Uses SFAccordion to provide expandable/collapsible behavior.
 */
export default {
  title: 'CMS Contentful/AccordionItem',
  component: AccordionItemComponent,
  argTypes: {
    title: {
      control: 'text',
      description: 'Title of the accordion item',
      name: 'contentElement.fields.title',
    },
    content: {
      control: 'object',
      description: 'Array of content items to display when expanded',
      name: 'contentElement.fields.content',
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
      const contentElement = computed(() =>
        createContentElement(args.title, args.content),
      )
      return { contentElement }
    },
    template: `
      <div class="w-full max-w-160">
        <AccordionItemComponent :content-element="contentElement" />
      </div>
    `,
  }),
}

/** Basic accordion item with section content containing background color and text */
export const BasicItem = {
  args: {
    title: 'Shipping Information',
    content: [
      {
        sys: {
          id: 'section-basic',
          contentType: { sys: { id: 'SectionComponent' } },
        },
        fields: {
          backgroundColor: '#f0f9ff',
          padding: 'medium',
          content: [
            {
              sys: {
                id: 'text-basic',
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
      } as unknown as TypeSectionComponentWithoutUnresolvableLinksResponse,
    ],
  },
}
