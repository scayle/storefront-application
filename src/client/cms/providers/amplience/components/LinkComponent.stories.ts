import { computed } from 'vue'
import type {
  LinkComponent as LinkComponentType,
  URLType,
} from '@shared/types/cms/amplience'
import LinkComponent from './LinkComponent.vue'

interface LinkStoryArgs {
  link: string
  urlType: URLType
  openInNewTab: boolean
  label: string
}

const createContentElement = (args: LinkStoryArgs): LinkComponentType =>
  ({
    link: args.link,
    url_type: args.urlType,
    open_in_new_tab: args.openInNewTab,
    content: [
      {
        componentType: 'text',
        text: {
          content: args.label,
          textType: 'p',
          _meta: { schema: 'https://scayle.com/schemas/text-component.json' },
        },
      },
    ],
    _meta: { schema: 'https://scayle.com/schemas/link-component.json' },
  }) as unknown as LinkComponentType

/**
 * Amplience Link component wraps a text or image block so the whole thing becomes
 * clickable. The `url_type` field marks the destination as an internal path or an
 * external URL, and `open_in_new_tab` controls the target explicitly rather than
 * being inferred from the URL.
 */
export default {
  title: 'CMS Amplience/Link',
  component: LinkComponent,
  argTypes: {
    link: {
      control: 'text',
      description: 'Destination path or URL',
      name: 'contentElement.link',
    },
    urlType: {
      control: 'select',
      options: ['internal', 'external'],
      description:
        'Whether the destination is an internal path or external URL',
      name: 'contentElement.url_type',
    },
    openInNewTab: {
      control: 'boolean',
      description: 'Whether the link opens in a new tab',
      name: 'contentElement.open_in_new_tab',
    },
    label: {
      control: 'text',
      description: 'Text of the wrapped block that becomes clickable',
      name: 'contentElement.content[0].text.content',
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
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template: '<LinkComponent :content-element="contentElement" />',
  }),
}

/** Internal path, localized by the link component */
export const Internal = {
  args: {
    link: '/content/about',
    urlType: 'internal',
    openInNewTab: false,
    label: 'About us',
  },
}

export const External = {
  args: {
    link: 'https://scayle.com',
    urlType: 'external',
    openInNewTab: true,
    label: 'Visit SCAYLE',
  },
}

/** An internal path can still be set to open in a new tab */
export const InternalInNewTab = {
  args: {
    link: '/content/size-guide',
    urlType: 'internal',
    openInNewTab: true,
    label: 'Open the size guide',
  },
}
