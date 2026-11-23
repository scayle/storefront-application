import { computed } from 'vue'
import type { CountdownTimerComponent as CountdownTimerComponentType } from '@shared/types/cms/amplience'
import CountdownTimerComponent from './CountdownTimerComponent.vue'

interface CountdownStoryArgs {
  endDate: string
  size: CountdownTimerComponentType['size']
}

/** Two days out, so the story shows a full day/hour/minute readout. */
const defaultEndDate = new Date(
  Date.now() + 2 * 24 * 60 * 60 * 1000,
).toISOString()

const createContentElement = (
  endDate: string,
  size: CountdownTimerComponentType['size'] = 'small',
): CountdownTimerComponentType => ({
  end_date: endDate,
  size,
  _meta: {
    schema: 'https://scayle.com/schemas/countdown-timer-component.json',
  },
})

/**
 * Amplience Countdown Timer counts down to a target date and time, for sale
 * endings or launch moments. The timer renders client-side only, with a skeleton
 * during hydration, because it depends on the current time.
 */
export default {
  title: 'CMS Amplience/CountdownTimer',
  component: CountdownTimerComponent,
  argTypes: {
    endDate: {
      control: 'text',
      description: 'ISO date and time the timer counts down to',
      name: 'contentElement.end_date',
    },
    size: {
      control: 'select',
      options: ['small', 'large'],
      description: 'Visual size of the timer',
      name: 'contentElement.size',
    },
  },
  parameters: {
    layout: 'centered',
    docs: {
      source: {
        code: '<CountdownTimerComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: CountdownStoryArgs) => ({
    components: { CountdownTimerComponent },
    setup() {
      const contentElement = computed(() =>
        createContentElement(args.endDate, args.size),
      )
      return { contentElement }
    },
    template: '<CountdownTimerComponent :content-element="contentElement" />',
  }),
}

/** Compact timer for inline use next to copy */
export const Small = {
  args: { endDate: defaultEndDate, size: 'small' },
}

/** Prominent timer for a hero or campaign banner */
export const Large = {
  args: { endDate: defaultEndDate, size: 'large' },
}
