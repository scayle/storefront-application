import { computed } from 'vue'
import type {
  SliderComponent as SliderComponentType,
  SectionComponent as SectionComponentType,
} from '@shared/types/cms/contentstack'
import SliderComponent from './SliderComponent.vue'

interface SliderStoryArgs {
  content: SliderComponentType['content']
  show_navigation_arrows: boolean
  show_pagination_indicators: boolean
}

const createSectionSlide = (
  uid: string,
  text: string,
  bgColor: string,
): SectionComponentType =>
  ({
    _content_type_uid: 'section-component',
    uid,
    title: 'Section Slide',
    background_color: bgColor,
    padding: 'large',
    min_height_desktop: 300,
    min_height_mobile: 200,
    horizontal_content_alignment: 'Center',
    vertical_content_alignment: 'Middle',
    content: [
      {
        _content_type_uid: 'text-component',
        uid: `text-${uid}`,
        title: 'Slide Text',
        content: text,
        text_type: 'h2',
      },
    ],
  }) as const as unknown as SectionComponentType

const mockSlides = [
  createSectionSlide('slide-1', 'Slide 1', '#dbeafe'),
  createSectionSlide('slide-2', 'Slide 2', '#fef3c7'),
  createSectionSlide('slide-3', 'Slide 3', '#dcfce7'),
  createSectionSlide('slide-4', 'Slide 4', '#fce7f3'),
]

const createContentElement = (args: SliderStoryArgs): SliderComponentType => ({
  content: args.content,
  show_navigation_arrows: args.show_navigation_arrows,
  show_pagination_indicators: args.show_pagination_indicators,
  _content_type_uid: 'slider-component',
  uid: 'story-uid',
  title: 'Slider',
})

/**
 * Contentstack Slider component renders content blocks in a horizontally scrollable carousel.
 * Supports navigation arrows and pagination indicators with snap scrolling behavior.
 */
export default {
  title: 'CMS Contentstack/Slider',
  component: SliderComponent,
  argTypes: {
    show_navigation_arrows: {
      control: 'boolean',
      description: 'Show navigation arrows for slide control',
      name: 'contentElement.show_navigation_arrows',
    },
    show_pagination_indicators: {
      control: 'boolean',
      description: 'Show pagination dots below the slider',
      name: 'contentElement.show_pagination_indicators',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<SliderComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: SliderStoryArgs) => ({
    components: { SliderComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template: '<SliderComponent :content-element="contentElement" />',
  }),
}

/** Slider with both navigation arrows and pagination indicators */
export const Default = {
  args: {
    content: mockSlides,
    show_navigation_arrows: true,
    show_pagination_indicators: true,
  },
}

/** Slider without navigation arrows, pagination indicators only */
export const PaginationOnly = {
  args: {
    content: mockSlides,
    show_navigation_arrows: false,
    show_pagination_indicators: true,
  },
}

/** Slider with navigation arrows only */
export const ArrowsOnly = {
  args: {
    content: mockSlides,
    show_navigation_arrows: true,
    show_pagination_indicators: false,
  },
}

/** Minimal slider without any navigation controls */
export const Minimal = {
  args: {
    content: mockSlides,
    show_navigation_arrows: false,
    show_pagination_indicators: false,
  },
}
