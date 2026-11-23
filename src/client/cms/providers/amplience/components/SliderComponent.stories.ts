import { computed } from 'vue'
import type { SliderComponent as SliderComponentType } from '@shared/types/cms/amplience'
import SliderComponent from './SliderComponent.vue'

interface SliderStoryArgs {
  showNavigationArrows: boolean
  showPaginationIndicators: boolean
  slideCount: number
}

const slide = (content: string) => ({
  componentType: 'text',
  text: {
    content,
    textType: 'h2',
    _meta: { schema: 'https://scayle.com/schemas/text-component.json' },
  },
})

const createContentElement = (args: SliderStoryArgs): SliderComponentType =>
  ({
    show_navigation_arrows: args.showNavigationArrows,
    show_pagination_indicators: args.showPaginationIndicators,
    content: Array.from({ length: args.slideCount }, (_, index) =>
      slide(`Slide ${index + 1}`),
    ),
    _meta: { schema: 'https://scayle.com/schemas/slider-component.json' },
  }) as unknown as SliderComponentType

/**
 * Amplience Slider component shows nested blocks one slide at a time, with
 * optional navigation arrows and pagination dots. Both controls default to on when
 * the author has not set the flags, matching the V2 behavior.
 */
export default {
  title: 'CMS Amplience/Slider',
  component: SliderComponent,
  argTypes: {
    showNavigationArrows: {
      control: 'boolean',
      description: 'Whether previous and next arrows are shown on desktop',
      name: 'contentElement.show_navigation_arrows',
    },
    showPaginationIndicators: {
      control: 'boolean',
      description: 'Whether pagination dots are shown',
      name: 'contentElement.show_pagination_indicators',
    },
    slideCount: {
      control: { type: 'range', min: 1, max: 8, step: 1 },
      description: 'How many placeholder slides the story renders',
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

/** Both controls on, the default authoring state */
export const Default = {
  args: {
    showNavigationArrows: true,
    showPaginationIndicators: true,
    slideCount: 3,
  },
}

/** Dots only, for a touch-first carousel */
export const PaginationOnly = {
  args: {
    showNavigationArrows: false,
    showPaginationIndicators: true,
    slideCount: 4,
  },
}

export const ArrowsOnly = {
  args: {
    showNavigationArrows: true,
    showPaginationIndicators: false,
    slideCount: 4,
  },
}

/** A single slide, where the controls have nothing to scroll to */
export const SingleSlide = {
  args: {
    showNavigationArrows: true,
    showPaginationIndicators: true,
    slideCount: 1,
  },
}
