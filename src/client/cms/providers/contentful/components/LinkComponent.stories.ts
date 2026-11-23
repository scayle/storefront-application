import { computed } from 'vue'
import type {
  TypeLinkComponentWithoutUnresolvableLinksResponse,
  TypeTextComponentWithoutUnresolvableLinksResponse,
  TypeSectionComponentWithoutUnresolvableLinksResponse,
} from '@shared/types/cms/contentful'
import LinkComponent from './LinkComponent.vue'

interface LinkStoryArgs {
  url: string
  openInNewTab: boolean
  content: TypeLinkComponentWithoutUnresolvableLinksResponse['fields']['content']
}

const createContentElement = (
  url: string,
  openInNewTab = false,
  content?: TypeLinkComponentWithoutUnresolvableLinksResponse['fields']['content'],
): TypeLinkComponentWithoutUnresolvableLinksResponse =>
  ({
    sys: {
      id: 'link-basic',
      contentType: { sys: { id: 'LinkComponent' } },
    },
    fields: {
      url,
      openInNewTab,
      content,
    },
  }) as unknown as TypeLinkComponentWithoutUnresolvableLinksResponse

const mockTextChild = {
  sys: {
    id: 'text-child-1',
    contentType: { sys: { id: 'TextComponent' } },
  },
  fields: {
    content: 'Click me to navigate',
    textType: 'p',
  },
} as unknown as TypeTextComponentWithoutUnresolvableLinksResponse

const mockSectionChild = {
  sys: {
    id: 'section-child-1',
    contentType: { sys: { id: 'SectionComponent' } },
  },
  fields: {
    backgroundColor: '#f0f9ff',
    padding: 'medium',
    content: [
      {
        sys: {
          id: 'text-in-section-1',
          contentType: { sys: { id: 'TextComponent' } },
        },
        fields: {
          content: 'Section with multiple elements',
          textType: 'h3',
        },
      },
      {
        sys: {
          id: 'text-in-section-2',
          contentType: { sys: { id: 'TextComponent' } },
        },
        fields: {
          content: 'All wrapped inside a single link.',
          textType: 'p',
        },
      },
    ],
  },
} as unknown as TypeSectionComponentWithoutUnresolvableLinksResponse

/**
 * Contentful Link component wraps a single child content entry in a navigation
 * link. The `url` field takes an internal path or an external URL, and
 * `openInNewTab` sets the target.
 */
export default {
  title: 'CMS Contentful/Link',
  component: LinkComponent,
  argTypes: {
    url: {
      control: 'text',
      description: 'URL for the link destination',
      name: 'contentElement.fields.url',
    },
    openInNewTab: {
      control: 'boolean',
      description: 'Whether to open the link in a new tab',
      name: 'contentElement.fields.openInNewTab',
    },
    content: {
      control: 'object',
      description: 'Child content block rendered inside the link',
      name: 'contentElement.fields.content',
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
        createContentElement(args.url, args.openInNewTab, args.content),
      )
      return { contentElement }
    },
    template: '<LinkComponent :content-element="contentElement" />',
  }),
}

/** Internal link pointing to a storefront page */
export const InternalLink = {
  args: {
    url: '/products/new-arrivals',
    openInNewTab: false,
    content: mockTextChild,
  },
}

/** External link opening in a new tab */
export const ExternalLink = {
  args: {
    url: 'https://example.com',
    openInNewTab: true,
    content: mockTextChild,
  },
}

/** Link wrapping a section with multiple child elements */
export const WithMultipleChildren = {
  args: {
    url: '/promotions',
    openInNewTab: false,
    content: mockSectionChild,
  },
}
