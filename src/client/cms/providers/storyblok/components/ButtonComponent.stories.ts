import { computed } from 'vue'
import type {
  ButtonComponent as ButtonComponentType,
  StoryblokMultilink,
} from '@shared/types/cms/storyblok'
import ButtonComponent from './ButtonComponent.vue'

interface ButtonStoryArgs {
  text: string
  style: ButtonComponentType['style']
  url: string
  linktype: 'story' | 'url'
  target: StoryblokMultilink['target']
}

const createContentElement = (
  text: string,
  style: ButtonComponentType['style'] = 'primary',
  url = '/example-page',
  linktype: 'story' | 'url' = 'story',
  target: StoryblokMultilink['target'] = '_self',
): ButtonComponentType => ({
  text,
  style,
  url: {
    cached_url: url,
    linktype,
    target,
  } as Exclude<
    StoryblokMultilink,
    { linktype?: 'email' } | { linktype?: 'asset' }
  >,
  component: 'ButtonComponent',
  _uid: 'story-uid',
})

/**
 * Storyblok Button component renders interactive button elements from Storyblok CMS data.
 * Supports primary, secondary, accent, and plain visual styles and can function as both
 * action buttons and navigation links.
 */
export default {
  title: 'CMS Storyblok/Button',
  component: ButtonComponent,
  argTypes: {
    text: {
      control: 'text',
      description: 'Button text content',
      name: 'contentElement.text',
    },
    style: {
      control: 'select',
      options: ['', 'primary', 'secondary', 'accent', 'plain'],
      description: 'Visual style variant of the button',
      name: 'contentElement.style',
    },
    url: {
      control: 'text',
      description: 'URL for the button link',
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
    layout: 'centered',
    docs: {
      source: {
        code: '<ButtonComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: ButtonStoryArgs) => ({
    components: { ButtonComponent },
    setup() {
      const contentElement = computed(() =>
        createContentElement(
          args.text,
          args.style,
          args.url,
          args.linktype,
          args.target,
        ),
      )
      return { contentElement }
    },
    template: '<ButtonComponent :content-element="contentElement" />',
  }),
}

/** Primary button for main call-to-action */
export const Primary = {
  args: {
    text: 'Primary Button',
    style: 'primary',
    url: '/example-page',
    linktype: 'story',
    target: '_self',
  },
}

/** Secondary button for supporting actions */
export const Secondary = {
  args: {
    text: 'Secondary Button',
    style: 'secondary',
    url: '/example-page',
    linktype: 'story',
    target: '_self',
  },
}

/** Accent button for special emphasis */
export const Accent = {
  args: {
    text: 'Accent Button',
    style: 'accent',
    url: '/example-page',
    linktype: 'story',
    target: '_self',
  },
}

/**
 * Plain button for low-emphasis actions such as secondary navigation or text-adjacent triggers.
 */
export const Plain = {
  args: {
    text: 'Plain Button',
    style: 'plain',
    url: '/example-page',
    linktype: 'story',
    target: '_self',
  },
}
