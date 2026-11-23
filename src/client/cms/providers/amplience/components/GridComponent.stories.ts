import { computed } from 'vue'
import type { GridComponent as GridComponentType } from '@shared/types/cms/amplience'
import GridComponent from './GridComponent.vue'

/** Gap size tokens the grid accepts on either axis and breakpoint. */
type GridGap = 'none' | 'small' | 'medium' | 'large'

interface GridStoryArgs {
  columnsDesktop: number
  columnsMobile: number
  gapColumnDesktop: GridGap
  gapRowDesktop: GridGap
  gapColumnMobile: GridGap
  gapRowMobile: GridGap
  verticalContentAlignment: 'Top' | 'Middle' | 'Bottom'
  horizontalContentAlignment: 'Left' | 'Center' | 'Right'
  cellCount: number
}

const textBlock = (content: string) => ({
  componentType: 'text',
  text: {
    content,
    textType: 'p',
    _meta: { schema: 'https://scayle.com/schemas/text-component.json' },
  },
})

const createContentElement = (args: GridStoryArgs): GridComponentType =>
  ({
    columns_desktop: args.columnsDesktop,
    columns_mobile: args.columnsMobile,
    gap_column_desktop: args.gapColumnDesktop,
    gap_row_desktop: args.gapRowDesktop,
    gap_column_mobile: args.gapColumnMobile,
    gap_row_mobile: args.gapRowMobile,
    vertical_content_alignment: args.verticalContentAlignment,
    horizontal_content_alignment: args.horizontalContentAlignment,
    content: Array.from({ length: args.cellCount }, (_, index) =>
      textBlock(`Cell ${index + 1}`),
    ),
    _meta: { schema: 'https://scayle.com/schemas/grid-component.json' },
  }) as unknown as GridComponentType

const GAP_OPTIONS: GridGap[] = ['none', 'small', 'medium', 'large']

/**
 * Amplience Grid component arranges nested blocks in columns, with independent
 * column counts and gaps for mobile and desktop.
 *
 * The grid also narrows the viewport fraction it passes to nested media blocks, so
 * an image inside a three-column grid requests a third of the width rather than a
 * full-width rendition.
 */
export default {
  title: 'CMS Amplience/Grid',
  component: GridComponent,
  argTypes: {
    columnsDesktop: {
      control: { type: 'range', min: 1, max: 6, step: 1 },
      description: 'Number of columns on desktop',
      name: 'contentElement.columns_desktop',
    },
    columnsMobile: {
      control: { type: 'range', min: 1, max: 3, step: 1 },
      description: 'Number of columns on mobile',
      name: 'contentElement.columns_mobile',
    },
    gapColumnDesktop: {
      control: 'select',
      options: GAP_OPTIONS,
      description: 'Horizontal spacing between columns on desktop',
      name: 'contentElement.gap_column_desktop',
    },
    gapRowDesktop: {
      control: 'select',
      options: GAP_OPTIONS,
      description: 'Vertical spacing between rows on desktop',
      name: 'contentElement.gap_row_desktop',
    },
    gapColumnMobile: {
      control: 'select',
      options: GAP_OPTIONS,
      description: 'Horizontal spacing between columns on mobile',
      name: 'contentElement.gap_column_mobile',
    },
    gapRowMobile: {
      control: 'select',
      options: GAP_OPTIONS,
      description: 'Vertical spacing between rows on mobile',
      name: 'contentElement.gap_row_mobile',
    },
    verticalContentAlignment: {
      control: 'select',
      options: ['Top', 'Middle', 'Bottom'],
      description: 'Vertical alignment of content within grid cells',
      name: 'contentElement.vertical_content_alignment',
    },
    horizontalContentAlignment: {
      control: 'select',
      options: ['Left', 'Center', 'Right'],
      description: 'Horizontal alignment of content within grid cells',
      name: 'contentElement.horizontal_content_alignment',
    },
    cellCount: {
      control: { type: 'range', min: 1, max: 12, step: 1 },
      description: 'How many placeholder cells the story renders',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<GridComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: GridStoryArgs) => ({
    components: { GridComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template: '<GridComponent :content-element="contentElement" />',
  }),
}

const baseArgs = {
  columnsDesktop: 2,
  columnsMobile: 1,
  gapColumnDesktop: 'medium',
  gapRowDesktop: 'medium',
  gapColumnMobile: 'small',
  gapRowMobile: 'small',
  verticalContentAlignment: 'Middle',
  horizontalContentAlignment: 'Center',
  cellCount: 4,
}

/** Two columns on desktop, stacked on mobile */
export const TwoColumns = { args: baseArgs }

export const ThreeColumns = {
  args: { ...baseArgs, columnsDesktop: 3, cellCount: 6 },
}

/** Four columns, a common product or category tile layout */
export const FourColumns = {
  args: { ...baseArgs, columnsDesktop: 4, columnsMobile: 2, cellCount: 8 },
}

/** Two columns even on mobile */
export const TwoColumnsOnMobile = {
  args: { ...baseArgs, columnsMobile: 2, cellCount: 4 },
}

/** No gaps, for edge-to-edge tiles */
export const NoGaps = {
  args: {
    ...baseArgs,
    gapColumnDesktop: 'none',
    gapRowDesktop: 'none',
    gapColumnMobile: 'none',
    gapRowMobile: 'none',
  },
}

export const LargeGaps = {
  args: {
    ...baseArgs,
    gapColumnDesktop: 'large',
    gapRowDesktop: 'large',
  },
}
