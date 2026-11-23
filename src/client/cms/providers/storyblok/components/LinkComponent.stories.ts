import { computed } from 'vue'
import type {
  LinkComponent as LinkComponentType,
  StoryblokMultilink,
} from '@shared/types/cms/storyblok'
import LinkComponent from './LinkComponent.vue'

interface LinkStoryArgs {
  url: string
  linktype: 'story' | 'url'
  target: StoryblokMultilink['target']
  content: LinkComponentType['content']
}

const createContentElement = (
  url: string,
  linktype: 'story' | 'url' = 'story',
  target: StoryblokMultilink['target'] = '_self',
  content: LinkComponentType['content'] = [],
): LinkComponentType => ({
  url: {
    cached_url: url,
    linktype,
    target,
  } as Exclude<
    StoryblokMultilink,
    { linktype?: 'email' } | { linktype?: 'asset' }
  >,
  content,
  component: 'LinkComponent',
  _uid: 'story-uid',
})

/**
 * Storyblok Link component wraps child content in a navigational link.
 * Supports internal Storyblok story links and external URLs with configurable target behavior.
 */
export default {
  title: 'CMS Storyblok/Link',
  component: LinkComponent,
  argTypes: {
    url: {
      control: 'text',
      description: 'Link URL',
      name: 'contentElement.url.cached_url',
    },
    linktype: {
      control: 'select',
      options: ['story', 'url'],
      description: 'Type of link (internal story or external URL)',
      name: 'contentElement.url.linktype',
    },
    target: {
      control: 'select',
      options: ['_self', '_blank'],
      description: 'Link target (same tab or new tab)',
      name: 'contentElement.url.target',
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
        createContentElement(
          args.url,
          args.linktype,
          args.target,
          args.content,
        ),
      )
      return { contentElement }
    },
    template: '<LinkComponent :content-element="contentElement" />',
  }),
}

/** Internal story link wrapping a text block */
export const InternalLink = {
  args: {
    url: '/content/about',
    linktype: 'story',
    target: '_self',
    content: [
      {
        component: 'TextComponent',
        _uid: 'text-link-1',
        content: 'Read more about us',
        textType: 'p',
      },
    ],
  },
}

/** External URL opening in a new tab */
export const ExternalLink = {
  args: {
    url: 'https://example.com',
    linktype: 'url',
    target: '_blank',
    content: [
      {
        component: 'TextComponent',
        _uid: 'text-link-2',
        content: 'Visit external site',
        textType: 'p',
      },
    ],
  },
}

/** Link wrapping multiple child content blocks */
export const WithMultipleChildren = {
  args: {
    url: '/products',
    linktype: 'story',
    target: '_self',
    content: [
      {
        component: 'TextComponent',
        _uid: 'text-link-3',
        content: 'Browse our collection',
        textType: 'h3',
      },
      {
        component: 'TextComponent',
        _uid: 'text-link-4',
        content: 'Find something you love',
        textType: 'p',
      },
    ],
  },
}
