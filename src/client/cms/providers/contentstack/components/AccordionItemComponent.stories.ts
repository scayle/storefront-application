import { computed } from 'vue'
import type {
  AccordionItemComponent as AccordionItemComponentType,
  SectionComponent as SectionComponentType,
} from '@shared/types/cms/contentstack'
import AccordionItemComponent from './AccordionItemComponent.vue'

interface AccordionItemStoryArgs {
  display_title: string
  content: AccordionItemComponentType['content']
}

const createContentElement = (
  display_title = 'Default Title',
  content: AccordionItemComponentType['content'] = [],
): AccordionItemComponentType => ({
  display_title,
  title: display_title,
  content,
  _content_type_uid: 'accordion_item-component',
  uid: 'story-uid',
})

/**
 * Contentstack AccordionItem component renders a single collapsible accordion entry with a title and content.
 * Uses SFAccordion to provide expandable/collapsible behavior.
 */
export default {
  title: 'CMS Contentstack/AccordionItem',
  component: AccordionItemComponent,
  argTypes: {
    display_title: {
      control: 'text',
      description: 'Title of the accordion item',
      name: 'contentElement.display_title',
    },
    content: {
      control: 'object',
      description: 'Array of content items to display when expanded',
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
      const contentElement = computed(() =>
        createContentElement(args.display_title, args.content),
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
    display_title: 'Shipping Information',
    content: [
      {
        _content_type_uid: 'section-component',
        uid: 'section-basic',
        title: 'Section',
        background_color: '#f0f9ff',
        padding: 'medium',
        content: [
          {
            _content_type_uid: 'text-component',
            uid: 'text-basic',
            title: 'Text',
            content:
              'We offer free shipping on orders over $50. Standard shipping takes 3-5 business days, while express shipping delivers within 1-2 business days.',
            text_type: 'p',
          },
        ],
      } as SectionComponentType,
    ],
  },
}
