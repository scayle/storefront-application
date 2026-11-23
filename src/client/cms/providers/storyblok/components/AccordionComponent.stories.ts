import { computed } from 'vue'
import type {
  AccordionComponent as AccordionComponentType,
  AccordionItemComponent as AccordionItemComponentType,
} from '@shared/types/cms/storyblok'
import AccordionComponent from './AccordionComponent.vue'

interface AccordionStoryArgs {
  title?: string
  content: AccordionComponentType['content']
}

const createContentElement = (
  title?: string,
  content: AccordionComponentType['content'] = [],
): AccordionComponentType => ({
  title,
  content,
  component: 'AccordionComponent',
  _uid: 'story-uid',
})

const mockAccordionItem1 = {
  component: 'AccordionItemComponent',
  _uid: 'accordion-item-1',
  title: 'Shipping Information',
  content: [
    {
      component: 'SectionComponent',
      _uid: 'section-1',
      backgroundColor: '#f0f9ff',
      padding: 'medium',
      content: [
        {
          component: 'TextComponent',
          _uid: 'text-1',
          content:
            'We offer free shipping on orders over $50. Standard shipping takes 3-5 business days, while express shipping delivers within 1-2 business days.',
          textType: 'p',
        },
      ],
    },
  ],
} as AccordionItemComponentType

const mockAccordionItem2 = {
  component: 'AccordionItemComponent',
  _uid: 'accordion-item-2',
  title: 'Return Policy',
  content: [
    {
      component: 'SectionComponent',
      _uid: 'section-2',
      backgroundColor: '#fef3c7',
      padding: 'medium',
      content: [
        {
          component: 'TextComponent',
          _uid: 'text-2',
          content:
            'Returns are accepted within 30 days of purchase. Items must be unused and in original packaging. Return shipping costs are covered by the customer.',
          textType: 'p',
        },
      ],
    },
  ],
} as AccordionItemComponentType

const mockAccordionItem3 = {
  component: 'AccordionItemComponent',
  _uid: 'accordion-item-3',
  title: 'Product Care',
  content: [
    {
      component: 'SectionComponent',
      _uid: 'section-3',
      backgroundColor: '#f0fdf4',
      padding: 'medium',
      content: [
        {
          component: 'TextComponent',
          _uid: 'text-3',
          content:
            'Machine wash cold with like colors. Do not bleach. Tumble dry low. Iron on medium heat if needed. Do not dry clean.',
          textType: 'p',
        },
      ],
    },
  ],
} as AccordionItemComponentType

/**
 * Storyblok Accordion component displays a collapsible container with a title and multiple accordion items.
 * Renders accordion entries using AccordionItemComponent instances with expandable/collapsible behavior.
 */
export default {
  title: 'CMS Storyblok/Accordion',
  component: AccordionComponent,
  argTypes: {
    title: {
      control: 'text',
      description: 'Optional title displayed above accordion items',
      name: 'contentElement.title',
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

/** Accordion with title and multiple items */
export const WithTitle = {
  args: {
    title: 'Product FAQ',
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
    title: 'Contact Information',
    content: [mockAccordionItem1] as AccordionComponentType['content'],
  },
}
