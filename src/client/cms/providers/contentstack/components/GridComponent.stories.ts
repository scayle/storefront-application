import { computed } from 'vue'
import type {
  GridComponent as GridComponentType,
  SectionComponent as SectionComponentType,
} from '@shared/types/cms/contentstack'
import GridComponent from './GridComponent.vue'

interface GridStoryArgs {
  number_of_columns_desktop: number
  number_of_columns_mobile: number
  gap_column_desktop: NonNullable<
    GridComponentType['desktop']
  >['gap_column_desktop']
  gap_column_mobile: NonNullable<
    GridComponentType['mobile']
  >['gap_column_mobile']
  gap_row_desktop: NonNullable<GridComponentType['desktop']>['gap_row_desktop']
  gap_row_mobile: NonNullable<GridComponentType['mobile']>['gap_row_mobile']
  vertical_content_alignment: GridComponentType['vertical_content_alignment']
  horizontal_content_alignmen: GridComponentType['horizontal_content_alignmen']
  content: GridComponentType['content']
}

const mockSectionLight = {
  _content_type_uid: 'section-component',
  uid: 'section-light-1',
  title: 'Light Section',
  background_color: '#f8fafc',
  padding: 'medium',
  content: [
    {
      _content_type_uid: 'text-component',
      uid: 'text-content-1',
      title: 'Text',
      content: 'Light Background Section',
      text_type: 'h3',
    },
  ],
} as const as unknown as SectionComponentType

const mockSectionGray = {
  _content_type_uid: 'section-component',
  uid: 'section-gray-1',
  title: 'Gray Section',
  background_color: '#ebebeb',
  padding: 'medium',
  content: [
    {
      _content_type_uid: 'text-component',
      uid: 'text-content-2',
      title: 'Text',
      content: 'Gray Background Section',
      text_type: 'h3',
    },
  ],
} as const as unknown as SectionComponentType

const mockSectionPrimary = {
  _content_type_uid: 'section-component',
  uid: 'section-primary-1',
  title: 'Primary Section',
  background_color: '#dbeafe',
  padding: 'medium',
  content: [
    {
      _content_type_uid: 'text-component',
      uid: 'text-content-3',
      title: 'Text',
      content: 'Primary Background Section',
      text_type: 'h3',
    },
  ],
} as const as unknown as SectionComponentType

const mockSectionAccent = {
  _content_type_uid: 'section-component',
  uid: 'section-accent-1',
  title: 'Accent Section',
  background_color: '#fef3c7',
  padding: 'medium',
  content: [
    {
      _content_type_uid: 'text-component',
      uid: 'text-content-4',
      title: 'Text',
      content: 'Accent Background Section',
      text_type: 'h3',
    },
  ],
} as const as unknown as SectionComponentType

const createContentElement = (args: GridStoryArgs): GridComponentType => ({
  desktop: {
    number_of_columns_desktop: args.number_of_columns_desktop,
    gap_column_desktop: args.gap_column_desktop,
    gap_row_desktop: args.gap_row_desktop,
  },
  mobile: {
    number_of_columns_mobile: args.number_of_columns_mobile,
    gap_column_mobile: args.gap_column_mobile,
    gap_row_mobile: args.gap_row_mobile,
  },
  vertical_content_alignment: args.vertical_content_alignment,
  horizontal_content_alignmen: args.horizontal_content_alignmen,
  content: args.content,
  _content_type_uid: 'grid-component',
  uid: 'story-uid',
  title: 'Grid',
})

/**
 * Contentstack Grid component arranges content blocks in a responsive grid layout.
 * Supports configurable column counts, gap sizes, and content alignment for desktop and mobile.
 * Uses nested `desktop` and `mobile` objects for responsive configuration.
 */
export default {
  title: 'CMS Contentstack/Grid',
  component: GridComponent,
  argTypes: {
    number_of_columns_desktop: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6],
      description: 'Number of columns on desktop',
      name: 'contentElement.desktop.number_of_columns_desktop',
    },
    number_of_columns_mobile: {
      control: 'select',
      options: [1, 2, 3],
      description: 'Number of columns on mobile',
      name: 'contentElement.mobile.number_of_columns_mobile',
    },
    gap_column_desktop: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Column gap on desktop',
      name: 'contentElement.desktop.gap_column_desktop',
    },
    gap_column_mobile: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Column gap on mobile',
      name: 'contentElement.mobile.gap_column_mobile',
    },
    gap_row_desktop: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Row gap on desktop',
      name: 'contentElement.desktop.gap_row_desktop',
    },
    gap_row_mobile: {
      control: 'select',
      options: ['', 'none', 'small', 'medium', 'large'],
      description: 'Row gap on mobile',
      name: 'contentElement.mobile.gap_row_mobile',
    },
    vertical_content_alignment: {
      control: 'select',
      options: ['', 'Top', 'Middle', 'Bottom'],
      description: 'Vertical alignment of items within cells',
      name: 'contentElement.vertical_content_alignment',
    },
    horizontal_content_alignmen: {
      control: 'select',
      options: ['', 'Left', 'Center', 'Right'],
      description: 'Horizontal alignment of items within cells',
      name: 'contentElement.horizontal_content_alignmen',
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
    number_of_columns_desktop: 2,
    number_of_columns_mobile: 1,
    gap_column_desktop: 'medium',
    gap_column_mobile: 'small',
    gap_row_desktop: 'medium',
    gap_row_mobile: 'small',
    content: [
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
    number_of_columns_desktop: 3,
    number_of_columns_mobile: 1,
    gap_column_desktop: 'medium',
    gap_column_mobile: 'small',
    gap_row_desktop: 'medium',
    gap_row_mobile: 'small',
    content: [mockSectionLight, mockSectionGray, mockSectionPrimary],
  },
}

/** Four column grid */
export const FourColumns = {
  args: {
    number_of_columns_desktop: 4,
    number_of_columns_mobile: 2,
    gap_column_desktop: 'medium',
    gap_column_mobile: 'small',
    gap_row_desktop: 'medium',
    gap_row_mobile: 'small',
    content: [
      mockSectionLight,
      mockSectionGray,
      mockSectionPrimary,
      mockSectionAccent,
    ],
  },
}

/** Grid with large gaps between items */
export const LargeGaps = {
  args: {
    number_of_columns_desktop: 2,
    number_of_columns_mobile: 1,
    gap_column_desktop: 'large',
    gap_column_mobile: 'medium',
    gap_row_desktop: 'large',
    gap_row_mobile: 'medium',
    content: [mockSectionLight, mockSectionGray],
  },
}

/** Grid with no gaps between items */
export const NoGaps = {
  args: {
    number_of_columns_desktop: 2,
    number_of_columns_mobile: 1,
    gap_column_desktop: 'none',
    gap_column_mobile: 'none',
    gap_row_desktop: 'none',
    gap_row_mobile: 'none',
    content: [
      mockSectionLight,
      mockSectionGray,
      mockSectionPrimary,
      mockSectionAccent,
    ],
  },
}
