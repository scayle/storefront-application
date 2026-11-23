import { computed } from 'vue'
import type { DividerComponent as DividerComponentType } from '@shared/types/cms/amplience'
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
  _meta: { schema: 'https://scayle.com/schemas/divider-component.json' },
})

/**
 * Amplience Divider component provides visual and spacing separation between
 * content sections. The height field controls the vertical spacing, and the line
 * is optional so the block can act as pure spacing.
 */
export default {
  title: 'CMS Amplience/Divider',
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

/** Spacing only, with no visible rule */
export const SmallWithoutLine = {
  args: { height: 'small', showLine: false },
}

export const LargeWithoutLine = {
  args: { height: 'large', showLine: false },
}
