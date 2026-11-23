import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { vLivePreview } from '../directives/livePreview'
import CountdownTimerComponent from './CountdownTimerComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

const stubs = {
  SFCountdownSmall: { template: '<div data-testid="small" v-bind="$attrs" />' },
  SFCountdownLarge: { template: '<div data-testid="large" v-bind="$attrs" />' },
  SFCountdownSkeleton: {
    template: '<div data-testid="skeleton" v-bind="$attrs" />',
  },
}

const mountWith = async (
  size?: 'small' | 'large',
  endDate?: string,
  attrs?: Record<string, unknown>,
) => {
  const wrapper = mount(CountdownTimerComponent, {
    props: {
      contentElement: {
        end_date: endDate ?? new Date(Date.now() + 60_000).toISOString(),
        size,
        _content_type_uid: 'countdown_timer-component',
        uid: 'test',
        title: 'Countdown',
        $: {
          end_date: { 'data-cslp': 'countdown-timer.test.end_date' },
        },
      } as any,
    },
    attrs,
    global: { stubs, directives: cmsDirectives },
  })
  // ClientOnly renders its slot only after mount.
  await flushPromises()
  return wrapper
}

describe('Contentstack CountdownTimerComponent', () => {
  it.for([
    { size: 'large', shown: 'large', hidden: 'small' },
    { size: 'small', shown: 'small', hidden: 'large' },
    { size: undefined, shown: 'small', hidden: 'large' },
  ] as const)(
    'renders the $shown variant when size is $size',
    async ({ size, shown, hidden }) => {
      const wrapper = await mountWith(size)

      expect(wrapper.find(`[data-testid="${shown}"]`).exists()).toBe(true)
      expect(wrapper.find(`[data-testid="${hidden}"]`).exists()).toBe(false)
    },
  )

  it('renders nothing when the end date is missing', async () => {
    const wrapper = await mountWith('small', '')
    expect(wrapper.find('[data-testid="small"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="large"]').exists()).toBe(false)
  })

  it('forwards fallthrough attrs, which SectionComponent relies on for block spacing', async () => {
    const wrapper = await mountWith('small', undefined, { class: 'mt-auto' })

    expect(wrapper.find('[data-testid="small"]').classes()).toContain('mt-auto')
  })

  it('annotates the entry with the live-preview attribute of the end date field', async () => {
    const root = (await mountWith('small')).find('[data-testid="small"]')

    expect(root.attributes('data-cslp')).toBe('countdown-timer.test.end_date')
  })
})
