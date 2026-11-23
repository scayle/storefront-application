import { computed } from 'vue'
import type { LinkComponent as LinkComponentType } from '@shared/types/cms/contentstack'
import LinkComponent from './LinkComponent.vue'

interface LinkStoryArgs {
  url: string
  open_in_new_tab: boolean
  content: LinkComponentType['content']
}

const createContentElement = (
  url: string,
  open_in_new_tab = false,
  content: LinkComponentType['content'] = [],
): LinkComponentType => ({
  url,
  open_in_new_tab,
  content,
  _content_type_uid: 'link-component',
  uid: 'story-uid',
  title: 'Link',
})

/**
 * Contentstack Link component wraps child content in a navigational link.
 * Supports internal and external URLs with configurable target behavior.
 */
export default {
  title: 'CMS Contentstack/Link',
  component: LinkComponent,
  argTypes: {
    url: {
      control: 'text',
      description: 'Link URL',
      name: 'contentElement.url',
    },
    open_in_new_tab: {
      control: 'boolean',
      description: 'Whether the link opens in a new tab',
      name: 'contentElement.open_in_new_tab',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<LinkComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: LinkStoryArgs) => ({
    components: { LinkComponent },
    setup() {
      const contentElement = computed(() =>
        createContentElement(args.url, args.open_in_new_tab, args.content),
      )
      return { contentElement }
    },
    template: '<LinkComponent :content-element="contentElement" />',
  }),
}

/** Internal link wrapping a text block */
export const InternalLink = {
  args: {
    url: '/content/about',
    open_in_new_tab: false,
    content: [
      {
        _content_type_uid: 'text-component',
        uid: 'text-link-1',
        title: 'Text',
        content: 'Read more about us',
        text_type: 'p',
      },
    ],
  },
}

/** External URL opening in a new tab */
export const ExternalLink = {
  args: {
    url: 'https://example.com',
    open_in_new_tab: true,
    content: [
      {
        _content_type_uid: 'text-component',
        uid: 'text-link-2',
        title: 'Text',
        content: 'Visit external site',
        text_type: 'p',
      },
    ],
  },
}

/** Link wrapping multiple child content blocks */
export const WithMultipleChildren = {
  args: {
    url: '/products',
    open_in_new_tab: false,
    content: [
      {
        _content_type_uid: 'text-component',
        uid: 'text-link-3',
        title: 'Heading',
        content: 'Browse our collection',
        text_type: 'h3',
      },
      {
        _content_type_uid: 'text-component',
        uid: 'text-link-4',
        title: 'Body',
        content: 'Find something you love',
        text_type: 'p',
      },
    ],
  },
}
