import { computed } from 'vue'
import type { ButtonComponent as ButtonComponentType } from '@shared/types/cms/contentstack'
import ButtonComponent from './ButtonComponent.vue'

interface ButtonStoryArgs {
  text: string
  style: ButtonComponentType['style']
  url: string
  open_in_new_tab: boolean
}

const createContentElement = (
  text: string,
  style: ButtonComponentType['style'] = 'primary',
  url = '/example-page',
  open_in_new_tab = false,
): ButtonComponentType => ({
  text,
  style,
  url,
  open_in_new_tab,
  _content_type_uid: 'button-component',
  uid: 'story-uid',
  title: 'Button',
})

/**
 * Contentstack Button component renders interactive button elements from Contentstack CMS data.
 * Supports primary, secondary, accent, and plain visual styles and can function as both
 * action buttons and navigation links.
 */
export default {
  title: 'CMS Contentstack/Button',
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
      name: 'contentElement.url',
    },
    open_in_new_tab: {
      control: 'boolean',
      description: 'Whether the link opens in a new tab',
      name: 'contentElement.open_in_new_tab',
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
          args.open_in_new_tab,
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
    open_in_new_tab: false,
  },
}

/** Secondary button for supporting actions */
export const Secondary = {
  args: {
    text: 'Secondary Button',
    style: 'secondary',
    url: '/example-page',
    open_in_new_tab: false,
  },
}

/** Accent button for special emphasis */
export const Accent = {
  args: {
    text: 'Accent Button',
    style: 'accent',
    url: '/example-page',
    open_in_new_tab: false,
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
    open_in_new_tab: false,
  },
}
