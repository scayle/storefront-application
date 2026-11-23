import { computed } from 'vue'
import type { TypeDividerComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import DividerComponent from './DividerComponent.vue'

interface DividerStoryArgs {
  height: 'small' | 'medium' | 'large'
  showLine: boolean
}

const createContentElement = (
  height: 'small' | 'medium' | 'large' = 'small',
  showLine = true,
): TypeDividerComponentWithoutUnresolvableLinksResponse =>
  ({
    fields: {
      height,
      showLine,
    },
  }) as TypeDividerComponentWithoutUnresolvableLinksResponse

/**
 * Contentful Divider component provides visual and spacing separation between content sections.
 * Supports different height options for spacing and can optionally display a horizontal line.
 */
export default {
  title: 'CMS Contentful/Divider',
  component: DividerComponent,
  argTypes: {
    height: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Vertical spacing size for the divider',
      name: 'contentElement.fields.height',
    },
    showLine: {
      control: 'boolean',
      description: 'Whether to show a horizontal line',
      name: 'contentElement.fields.showLine',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<DividerComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: DividerStoryArgs) => ({
    components: { DividerComponent },
    setup() {
      const contentElement = computed(() =>
        createContentElement(args.height, args.showLine),
      )
      return { contentElement }
    },
    template: '<DividerComponent :content-element="contentElement" />',
  }),
}

export const SmallWithLine = {
  args: { height: 'small', showLine: true },
}

export const MediumWithLine = {
  args: { height: 'medium', showLine: true },
}

export const LargeWithLine = {
  args: { height: 'large', showLine: true },
}

export const SmallWithoutLine = {
  args: { height: 'small', showLine: false },
}

export const MediumWithoutLine = {
  args: { height: 'medium', showLine: false },
}

export const LargeWithoutLine = {
  args: { height: 'large', showLine: false },
}
