import { computed } from 'vue'
import type {
  GridComponent as GridComponentType,
  SectionComponent as SectionComponentType,
} from '@shared/types/cms/storyblok'
import GridComponent from './GridComponent.vue'

interface GridStoryArgs {
  numberOfColumnsDesktop: string
  numberOfColumnsMobile: string
  gapColumnDesktop: GridComponentType['gapColumnDesktop']
  gapColumnMobile: GridComponentType['gapColumnMobile']
  gapRowDesktop: GridComponentType['gapRowDesktop']
  gapRowMobile: GridComponentType['gapRowMobile']
  verticalContentAlignment: GridComponentType['verticalContentAlignment']
  horizontalContentAlignment: GridComponentType['horizontalContentAlignment']
  columnContent: GridComponentType['columnContent']
}

const mockSectionLight = {
  component: 'SectionComponent',
  _uid: 'section-light-1',
  backgroundColor: '#f8fafc',
  padding: 'medium',
  content: [
    {
      component: 'TextComponent',
      _uid: 'text-content-1',
      content: 'Light Background Section',
      textType: 'h3',
    },
  ],
} as const as unknown as SectionComponentType

const mockSectionGray = {
  component: 'SectionComponent',
  _uid: 'section-gray-1',
  backgroundColor: '#ebebeb',
  padding: 'medium',
  content: [
    {
      component: 'TextComponent',
      _uid: 'text-content-2',
      content: 'Gray Background Section',
      textType: 'h3',
    },
  ],
} as const as unknown as SectionComponentType

const mockSectionPrimary = {
  component: 'SectionComponent',
  _uid: 'section-primary-1',
  backgroundColor: '#dbeafe',
  padding: 'medium',
  content: [
    {
      component: 'TextComponent',
      _uid: 'text-content-3',
      content: 'Primary Background Section',
      textType: 'h3',
    },
  ],
} as const as unknown as SectionComponentType

const mockSectionAccent = {
  component: 'SectionComponent',
  _uid: 'section-accent-1',
  backgroundColor: '#fef3c7',
  padding: 'medium',
  content: [
    {
      component: 'TextComponent',
      _uid: 'text-content-4',
      content: 'Accent Background Section',
      textType: 'h3',
    },
  ],
} as const as unknown as SectionComponentType

const createContentElement = (args: GridStoryArgs): GridComponentType => ({
  numberOfColumnsDesktop: args.numberOfColumnsDesktop,
  numberOfColumnsMobile: args.numberOfColumnsMobile,
  gapColumnDesktop: args.gapColumnDesktop,
  gapColumnMobile: args.gapColumnMobile,
  gapRowDesktop: args.gapRowDesktop,
  gapRowMobile: args.gapRowMobile,
  verticalContentAlignment: args.verticalContentAlignment,
  horizontalContentAlignment: args.horizontalContentAlignment,
  columnContent: args.columnContent,
  component: 'GridComponent',
  _uid: 'story-uid',
})

/**
 * Storyblok Grid component arranges content blocks in a responsive grid layout.
 * Supports configurable column counts, gap sizes, and content alignment for desktop and mobile.
 */
export default {
  title: 'CMS Storyblok/Grid',
  component: GridComponent,
  argTypes: {
    numberOfColumnsDesktop: {
      control: 'select',
      options: ['1', '2', '3', '4', '5', '6'],
      description: 'Number of columns on desktop',
      name: 'contentElement.numberOfColumnsDesktop',
    },
    numberOfColumnsMobile: {
      control: 'select',
      options: ['1', '2', '3'],
      description: 'Number of columns on mobile',
      name: 'contentElement.numberOfColumnsMobile',
    },
    gapColumnDesktop: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Column gap on desktop',
      name: 'contentElement.gapColumnDesktop',
    },
    gapColumnMobile: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Column gap on mobile',
      name: 'contentElement.gapColumnMobile',
    },
    gapRowDesktop: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Row gap on desktop',
      name: 'contentElement.gapRowDesktop',
    },
    gapRowMobile: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Row gap on mobile',
      name: 'contentElement.gapRowMobile',
    },
    verticalContentAlignment: {
      control: 'select',
      options: ['', 'Top', 'Middle', 'Bottom'],
      description: 'Vertical alignment of items within cells',
      name: 'contentElement.verticalContentAlignment',
    },
    horizontalContentAlignment: {
      control: 'select',
      options: ['', 'Left', 'Center', 'Right'],
      description: 'Horizontal alignment of items within cells',
      name: 'contentElement.horizontalContentAlignment',
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

/** Two column grid with mixed content sections */
export const TwoColumns = {
  args: {
    numberOfColumnsDesktop: '2',
    numberOfColumnsMobile: '1',
    gapColumnDesktop: 'medium',
    gapColumnMobile: 'small',
    gapRowDesktop: 'medium',
    gapRowMobile: 'small',
    columnContent: [
      mockSectionLight,
      mockSectionGray,
      mockSectionPrimary,
      mockSectionAccent,
    ],
  },
}

/** Three column grid */
export const ThreeColumns = {
  args: {
    numberOfColumnsDesktop: '3',
    numberOfColumnsMobile: '1',
    gapColumnDesktop: 'medium',
    gapColumnMobile: 'small',
    gapRowDesktop: 'medium',
    gapRowMobile: 'small',
    columnContent: [mockSectionLight, mockSectionGray, mockSectionPrimary],
  },
}

/** Grid with large gaps between items */
export const LargeGaps = {
  args: {
    numberOfColumnsDesktop: '2',
    numberOfColumnsMobile: '1',
    gapColumnDesktop: 'large',
    gapColumnMobile: 'medium',
    gapRowDesktop: 'large',
    gapRowMobile: 'medium',
    columnContent: [mockSectionLight, mockSectionGray],
  },
}

/** Grid with no gaps between items */
export const NoGaps = {
  args: {
    numberOfColumnsDesktop: '2',
    numberOfColumnsMobile: '1',
    gapColumnDesktop: 'none',
    gapColumnMobile: 'none',
    gapRowDesktop: 'none',
    gapRowMobile: 'none',
    columnContent: [
      mockSectionLight,
      mockSectionGray,
      mockSectionPrimary,
      mockSectionAccent,
    ],
  },
}

/** Single column layout */
export const SingleColumn = {
  args: {
    numberOfColumnsDesktop: '1',
    numberOfColumnsMobile: '1',
    gapColumnDesktop: 'none',
    gapColumnMobile: 'none',
    gapRowDesktop: 'medium',
    gapRowMobile: 'small',
    columnContent: [mockSectionLight, mockSectionGray],
  },
}
