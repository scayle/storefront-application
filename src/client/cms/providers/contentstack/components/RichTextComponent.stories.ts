import { computed } from 'vue'
import type { RichtextComponent as RichtextComponentType } from '@shared/types/cms/contentstack'
import RichTextComponent from './RichTextComponent.vue'

const createContentElement = (
  content: RichtextComponentType['content'],
): RichtextComponentType => ({
  content,
  _content_type_uid: 'richtext-component',
  uid: 'story-uid',
  title: 'RichText',
})

/**
 * Contentstack RichText component renders Contentstack JSON RTE content as sanitized HTML.
 * Supports paragraphs, headings, lists, links, and other block-level elements.
 * Internal links are automatically localized to the current storefront country path.
 */
export default {
  title: 'CMS Contentstack/RichText',
  component: RichTextComponent,
  parameters: {
    docs: {
      source: {
        code: '<RichTextComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: { content: RichtextComponentType['content'] }) => ({
    components: { RichTextComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args.content))
      return { contentElement }
    },
    template: '<RichTextComponent :content-element="contentElement" />',
  }),
}

/** Complex content combining headings, paragraphs, lists, and links in Contentstack JSON RTE format */
export const Default = {
  args: {
    content: {
      type: 'doc',
      uid: 'rte-doc-1',
      _version: 1,
      attrs: {},
      children: [
        {
          type: 'h1',
          uid: 'h1-1',
          _version: 1,
          attrs: {},
          children: [{ text: 'Welcome to Our Store' }],
        },
        {
          type: 'p',
          uid: 'p-1',
          _version: 1,
          attrs: {},
          children: [
            {
              text: 'We offer a wide range of products for every occasion. Browse our collections and find something special.',
            },
          ],
        },
        {
          type: 'h2',
          uid: 'h2-1',
          _version: 1,
          attrs: {},
          children: [{ text: 'Why Shop With Us' }],
        },
        {
          type: 'ul',
          uid: 'ul-1',
          _version: 1,
          attrs: {},
          children: [
            {
              type: 'li',
              uid: 'li-1',
              _version: 1,
              attrs: {},
              children: [{ text: 'Free shipping on orders over $50' }],
            },
            {
              type: 'li',
              uid: 'li-2',
              _version: 1,
              attrs: {},
              children: [{ text: '30-day return policy' }],
            },
            {
              type: 'li',
              uid: 'li-3',
              _version: 1,
              attrs: {},
              children: [{ text: '24/7 customer support' }],
            },
          ],
        },
        {
          type: 'p',
          uid: 'p-2',
          _version: 1,
          attrs: {},
          children: [
            { text: 'Learn more on our ' },
            {
              text: 'help center',
              type: 'a',
              uid: 'a-1',
              _version: 1,
              attrs: { href: '/help', target: '_self' },
              children: [{ text: 'help center' }],
            },
            { text: '.' },
          ],
        },
      ],
    },
  },
}
