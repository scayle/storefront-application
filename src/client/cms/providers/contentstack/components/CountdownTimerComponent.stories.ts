import { computed } from 'vue'
import { DAY_MS, HOUR_MS } from '@client/utils/time'
import type { CountdownTimerComponent as CountdownTimerComponentType } from '@shared/types/cms/contentstack'
import CountdownTimerComponent from './CountdownTimerComponent.vue'

interface CountdownStoryArgs {
  end_date: string
  size: CountdownTimerComponentType['size']
}

const createContentElement = (
  end_date: string,
  size: CountdownTimerComponentType['size'] = 'small',
): CountdownTimerComponentType => ({
  end_date,
  size,
  _content_type_uid: 'countdown_timer-component',
  uid: 'story-uid',
  title: 'Countdown Timer',
})

/**
 * Contentstack Countdown Timer renders an urgency countdown from Contentstack CMS
 * data. Authors pick a mandatory end date and a size (small or large); the display
 * switches from "X Days left" to a ticking HH:MM:SS in the final 24 hours.
 */
export default {
  title: 'CMS Contentstack/Countdown Timer',
  component: CountdownTimerComponent,
  argTypes: {
    end_date: {
      control: 'text',
      description: 'ISO end date and time the countdown runs down to',
      name: 'contentElement.end_date',
    },
    size: {
      control: 'select',
      options: ['small', 'large'],
      description: 'Display size of the timer',
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
        createContentElement(args.end_date, args.size),
      )
      return { contentElement }
    },
    template: '<CountdownTimerComponent :content-element="contentElement" />',
  }),
}

/** Small timer in the standard state (more than 24h remaining). */
export const Small = {
  args: {
    end_date: new Date(Date.now() + 3 * DAY_MS).toISOString(),
    size: 'small',
  },
}

/** Large timer in the urgent state (less than 24h remaining). */
export const Large = {
  args: {
    end_date: new Date(Date.now() + 5 * HOUR_MS).toISOString(),
    size: 'large',
  },
}
