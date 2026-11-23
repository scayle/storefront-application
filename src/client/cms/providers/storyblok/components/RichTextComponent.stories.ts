import { computed } from 'vue'
import type { RichTextComponent as RichTextComponentType } from '@shared/types/cms/storyblok'
import RichTextComponent from './RichTextComponent.vue'

const createContentElement = (
  content: RichTextComponentType['content'],
): RichTextComponentType => ({
  content,
  component: 'RichTextComponent',
  _uid: 'story-uid',
})

/**
 * Storyblok RichText component renders Storyblok rich text content as sanitized HTML.
 * Supports paragraphs, headings, lists, links, and other block-level elements.
 * Internal links are automatically localized to the current storefront country path.
 */
export default {
  title: 'CMS Storyblok/RichText',
  component: RichTextComponent,
  parameters: {
    docs: {
      source: {
        code: '<RichTextComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: { content: RichTextComponentType['content'] }) => ({
    components: { RichTextComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args.content))
      return { contentElement }
    },
    template: '<RichTextComponent :content-element="contentElement" />',
  }),
}

/** Simple paragraph text */
export const SimpleParagraph = {
  args: {
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a simple paragraph of rich text content rendered from Storyblok.',
            },
          ],
        },
      ],
    },
  },
}

/** Multiple headings with body text */
export const WithHeadings = {
  args: {
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Main Heading' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Introduction paragraph below the main heading.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Section Heading' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Content within a subsection of the page.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Subsection Heading' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Detailed content within a subsection.',
            },
          ],
        },
      ],
    },
  },
}

/** Bulleted and ordered lists */
export const WithLists = {
  args: {
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Unordered List' }],
        },
        {
          type: 'bullet_list',
          content: [
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'First item' }],
                },
              ],
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Second item' }],
                },
              ],
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Third item' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Ordered List' }],
        },
        {
          type: 'ordered_list',
          content: [
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Step one' }],
                },
              ],
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Step two' }],
                },
              ],
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Step three' }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
}

/** Text with inline links */
export const WithLinks = {
  args: {
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Visit our ' },
            {
              type: 'text',
              text: 'about page',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: '/content/about',
                    target: '_self',
                    linktype: 'story',
                  },
                },
              ],
            },
            { type: 'text', text: ' or check out ' },
            {
              type: 'text',
              text: 'our partner site',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://example.com',
                    target: '_blank',
                    linktype: 'url',
                  },
                },
              ],
            },
            { type: 'text', text: ' for more information.' },
          ],
        },
      ],
    },
  },
}

/** Complex content combining headings, paragraphs, lists, and links */
export const ComplexContent = {
  args: {
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Welcome to Our Store' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'We offer a wide range of products for every occasion. Browse our collections and find something special.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Why Shop With Us' }],
        },
        {
          type: 'bullet_list',
          content: [
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Free shipping on orders over $50' },
                  ],
                },
              ],
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: '30-day return policy' }],
                },
              ],
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: '24/7 customer support' }],
                },
              ],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Learn more on our ' },
            {
              type: 'text',
              text: 'help center',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: '/help',
                    target: '_self',
                    linktype: 'story',
                  },
                },
              ],
            },
            { type: 'text', text: '.' },
          ],
        },
      ],
    },
  },
}
