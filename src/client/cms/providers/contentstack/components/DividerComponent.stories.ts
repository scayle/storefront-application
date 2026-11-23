import { computed } from 'vue'
import type { DividerComponent as DividerComponentType } from '@shared/types/cms/contentstack'
import DividerComponent from './DividerComponent.vue'

interface DividerStoryArgs {
  height: DividerComponentType['height']
  show_line: boolean
}

const createContentElement = (
  height: DividerComponentType['height'] = 'small',
  show_line = true,
): DividerComponentType => ({
  height,
  show_line,
  _content_type_uid: 'divider-component',
  uid: 'story-uid',
  title: 'Divider',
})

/**
 * Contentstack Divider component provides visual and spacing separation between content sections.
 * Supports different height options for spacing and can optionally display a horizontal line.
 */
export default {
  title: 'CMS Contentstack/Divider',
  component: DividerComponent,
  argTypes: {
    height: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Vertical spacing size for the divider',
      name: 'contentElement.height',
    },
    show_line: {
      control: 'boolean',
      description: 'Whether to show a horizontal line',
      name: 'contentElement.show_line',
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
        createContentElement(args.height, args.show_line),
      )
      return { contentElement }
    },
    template: '<DividerComponent :content-element="contentElement" />',
  }),
}

export const SmallWithLine = {
  args: { height: 'small', show_line: true },
}

export const MediumWithLine = {
  args: { height: 'medium', show_line: true },
}

export const LargeWithLine = {
  args: { height: 'large', show_line: true },
}

export const SmallWithoutLine = {
  args: { height: 'small', show_line: false },
}

export const MediumWithoutLine = {
  args: { height: 'medium', show_line: false },
}

export const LargeWithoutLine = {
  args: { height: 'large', show_line: false },
}
