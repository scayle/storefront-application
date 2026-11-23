import { computed } from 'vue'
import type { TypeButtonComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import ButtonComponent from './ButtonComponent.vue'

interface ButtonStoryArgs {
  text: string
  style: 'primary' | 'secondary' | 'accent' | 'plain'
  url: string
  openInNewTab: boolean
}

const createContentElement = (
  text: string,
  style: 'primary' | 'secondary' | 'accent' | 'plain' = 'primary',
  url = '/example-page',
  openInNewTab = false,
): TypeButtonComponentWithoutUnresolvableLinksResponse =>
  ({
    fields: {
      text,
      style,
      url,
      openInNewTab,
    },
  }) as TypeButtonComponentWithoutUnresolvableLinksResponse

/**
 * Contentful Button component renders interactive button elements from Contentful CMS data.
 * Supports primary, secondary, accent, and plain visual styles and can function as both
 * action buttons and navigation links.
 */
export default {
  title: 'CMS Contentful/Button',
  component: ButtonComponent,
  argTypes: {
    text: {
      control: 'text',
      description: 'Button text content',
      name: 'contentElement.fields.text',
    },
    style: {
      control: 'select',
      options: ['primary', 'secondary', 'accent', 'plain'],
      description: 'Visual style variant of the button',
      name: 'contentElement.fields.style',
    },
    url: {
      control: 'text',
      description: 'URL for the button link',
      name: 'contentElement.fields.url',
    },
    openInNewTab: {
      control: 'boolean',
      description: 'Whether to open the link in a new tab',
      name: 'contentElement.fields.openInNewTab',
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
          args.openInNewTab,
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
    openInNewTab: false,
  },
}

/** Secondary button for supporting actions */
export const Secondary = {
  args: {
    text: 'Secondary Button',
    style: 'secondary',
    url: '/example-page',
    openInNewTab: false,
  },
}

/** Accent button for special emphasis */
export const Accent = {
  args: {
    text: 'Accent Button',
    style: 'accent',
    url: '/example-page',
    openInNewTab: false,
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
    openInNewTab: false,
  },
}
