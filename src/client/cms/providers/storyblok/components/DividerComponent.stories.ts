import { computed } from 'vue'
import type { DividerComponent as DividerComponentType } from '@shared/types/cms/storyblok'
import DividerComponent from './DividerComponent.vue'

interface DividerStoryArgs {
  height: DividerComponentType['height']
  showLine: boolean
}

const createContentElement = (
  height: DividerComponentType['height'] = 'small',
  showLine = true,
): DividerComponentType => ({
  height,
  showLine,
  component: 'DividerComponent',
  _uid: 'story-uid',
})

/**
 * Storyblok Divider component provides visual and spacing separation between content sections.
 * Supports different height options for spacing and can optionally display a horizontal line.
 */
export default {
  title: 'CMS Storyblok/Divider',
  component: DividerComponent,
  argTypes: {
    height: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Vertical spacing size for the divider',
      name: 'contentElement.height',
    },
    showLine: {
      control: 'boolean',
      description: 'Whether to show a horizontal line',
      name: 'contentElement.showLine',
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
