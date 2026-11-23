import { computed } from 'vue'
import type { ButtonComponent as ButtonComponentType } from '@shared/types/cms/amplience'
import ButtonComponent from './ButtonComponent.vue'

interface ButtonStoryArgs {
  label: string
  link: string
  variant: ButtonComponentType['variant']
}

const createContentElement = (
  label: string,
  link: string,
  variant: ButtonComponentType['variant'] = 'primary',
): ButtonComponentType => ({
  label,
  link,
  variant,
  _meta: { schema: 'https://scayle.com/schemas/button-component.json' },
})

/**
 * Amplience Button component renders a call-to-action linking to an internal path
 * or an external URL. The Amplience `variant` field maps onto the storefront
 * button variants, with `outline` expressed as the storefront's `plain` style.
 *
 * The content type has no new-tab field, so an absolute URL opens in a new tab
 * and an internal path stays in place.
 */
export default {
  title: 'CMS Amplience/Button',
  component: ButtonComponent,
  argTypes: {
    label: {
      control: 'text',
      description: 'Button label',
      name: 'contentElement.label',
    },
    link: {
      control: 'text',
      description: 'Destination path or absolute URL',
      name: 'contentElement.link',
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'accent', 'raw'],
      description: 'Visual appearance of the button',
      name: 'contentElement.variant',
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
        createContentElement(args.label, args.link, args.variant),
      )
      return { contentElement }
    },
    template: '<ButtonComponent :content-element="contentElement" />',
  }),
}

export const Primary = {
  args: { label: 'Shop now', link: '/content/about', variant: 'primary' },
}

export const Secondary = {
  args: { label: 'Learn more', link: '/content/about', variant: 'secondary' },
}

/** Amplience `outline` renders as the storefront `plain` variant */
export const Outline = {
  args: { label: 'View details', link: '/content/about', variant: 'outline' },
}

export const Accent = {
  args: { label: 'Save now', link: '/content/about', variant: 'accent' },
}

/** Unstyled variant for fully custom call-to-action layouts */
export const Raw = {
  args: { label: 'Read the story', link: '/content/about', variant: 'raw' },
}

/** An absolute URL opens in a new tab */
export const ExternalLink = {
  args: {
    label: 'Visit SCAYLE',
    link: 'https://scayle.com',
    variant: 'primary',
  },
}
