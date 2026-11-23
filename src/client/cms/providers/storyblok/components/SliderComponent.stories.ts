import { computed } from 'vue'
import type {
  SliderComponent as SliderComponentType,
  SectionComponent as SectionComponentType,
} from '@shared/types/cms/storyblok'
import SliderComponent from './SliderComponent.vue'

interface SliderStoryArgs {
  content: SliderComponentType['content']
  showNavigationArrows: boolean
  showPaginationIndicators: boolean
}

const createSectionSlide = (
  uid: string,
  text: string,
  bgColor: string,
): SectionComponentType =>
  ({
    component: 'SectionComponent',
    _uid: uid,
    backgroundColor: bgColor,
    padding: 'large',
    minHeightDesktop: '300',
    minHeightMobile: '200',
    horizontalContentAlignment: 'Center',
    verticalContentAlignment: 'Middle',
    content: [
      {
        component: 'TextComponent',
        _uid: `text-${uid}`,
        content: text,
        textType: 'h2',
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
  showNavigationArrows: args.showNavigationArrows,
  showPaginationIndicators: args.showPaginationIndicators,
  component: 'SliderComponent',
  _uid: 'story-uid',
})

/**
 * Storyblok Slider component renders content blocks in a horizontally scrollable carousel.
 * Supports navigation arrows and pagination indicators with snap scrolling behavior.
 */
export default {
  title: 'CMS Storyblok/Slider',
  component: SliderComponent,
  argTypes: {
    showNavigationArrows: {
      control: 'boolean',
      description: 'Show navigation arrows for slide control',
      name: 'contentElement.showNavigationArrows',
    },
    showPaginationIndicators: {
      control: 'boolean',
      description: 'Show pagination dots below the slider',
      name: 'contentElement.showPaginationIndicators',
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
    showNavigationArrows: true,
    showPaginationIndicators: true,
  },
}

/** Slider without navigation arrows, pagination indicators only */
export const PaginationOnly = {
  args: {
    content: mockSlides,
    showNavigationArrows: false,
    showPaginationIndicators: true,
  },
}

/** Slider with navigation arrows only */
export const ArrowsOnly = {
  args: {
    content: mockSlides,
    showNavigationArrows: true,
    showPaginationIndicators: false,
  },
}

/** Minimal slider without any navigation controls */
export const Minimal = {
  args: {
    content: mockSlides,
    showNavigationArrows: false,
    showPaginationIndicators: false,
  },
}
