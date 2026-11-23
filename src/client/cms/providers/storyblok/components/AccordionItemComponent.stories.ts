import { computed } from 'vue'
import type {
  AccordionItemComponent as AccordionItemComponentType,
  SectionComponent as SectionComponentType,
} from '@shared/types/cms/storyblok'
import AccordionItemComponent from './AccordionItemComponent.vue'

interface AccordionItemStoryArgs {
  title: string
  content: AccordionItemComponentType['content']
}

const createContentElement = (
  title = 'Default Title',
  content: AccordionItemComponentType['content'] = [],
): AccordionItemComponentType => ({
  title,
  content,
  component: 'AccordionItemComponent',
  _uid: 'story-uid',
})

/**
 * Storyblok AccordionItem component renders a single collapsible accordion entry with a title and content.
 * Uses SFAccordion to provide expandable/collapsible behavior.
 */
export default {
  title: 'CMS Storyblok/AccordionItem',
  component: AccordionItemComponent,
  argTypes: {
    title: {
      control: 'text',
      description: 'Title of the accordion item',
      name: 'contentElement.title',
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
        component: 'SectionComponent',
        _uid: 'section-basic',
        backgroundColor: '#f0f9ff',
        padding: 'medium',
        content: [
          {
            component: 'TextComponent',
            _uid: 'text-basic',
            content:
              'We offer free shipping on orders over $50. Standard shipping takes 3-5 business days, while express shipping delivers within 1-2 business days.',
            textType: 'p',
          },
        ],
      } as SectionComponentType,
    ],
  },
}
