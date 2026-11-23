import { computed } from 'vue'
import { DAY_MS, HOUR_MS } from '@client/utils/time'
import type { TypeCountdownTimerComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import CountdownTimerComponent from './CountdownTimerComponent.vue'

interface CountdownStoryArgs {
  endDate: string
  size: 'small' | 'large'
}

const createContentElement = (
  endDate: string,
  size: 'small' | 'large' = 'small',
): TypeCountdownTimerComponentWithoutUnresolvableLinksResponse =>
  ({
    sys: {
      id: 'story-id',
      contentType: { sys: { id: 'CountdownTimerComponent' } },
    },
    fields: { endDate, size, name: 'Countdown Timer' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- The story fixture fills only the fields the component reads, so it is cast past the full generated entry type
  }) as any

/**
 * Contentful Countdown Timer renders an urgency countdown from Contentful CMS data.
 * Authors pick a mandatory end date and a size (small or large); the display
 * switches from "X Days left" to a ticking HH:MM:SS in the final 24 hours.
 */
export default {
  title: 'CMS Contentful/Countdown Timer',
  component: CountdownTimerComponent,
  argTypes: {
    endDate: {
      control: 'text',
      description: 'ISO end date and time the countdown runs down to',
      name: 'contentElement.fields.endDate',
    },
    size: {
      control: 'select',
      options: ['small', 'large'],
      description: 'Display size of the timer',
      name: 'contentElement.fields.size',
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

/** Small timer in the standard state (more than 24h remaining). */
export const Small = {
  args: {
    endDate: new Date(Date.now() + 3 * DAY_MS).toISOString(),
    size: 'small',
  },
}

/** Large timer in the urgent state (less than 24h remaining). */
export const Large = {
  args: {
    endDate: new Date(Date.now() + 5 * HOUR_MS).toISOString(),
    size: 'large',
  },
}
