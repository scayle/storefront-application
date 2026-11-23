import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { vEditable } from '../directives/editable'
import CountdownTimerComponent from './CountdownTimerComponent.vue'

const cmsDirectives = { editable: vEditable }

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
  options?: { attrs?: Record<string, unknown>; editable?: boolean },
) => {
  const wrapper = mount(CountdownTimerComponent, {
    props: {
      contentElement: {
        endDate: endDate ?? new Date(Date.now() + 60_000).toISOString(),
        size,
        component: 'CountdownTimerComponent',
        _uid: 'test',
        ...(options?.editable
          ? {
              _editable:
                '<!--#storyblok#{"name":"CountdownTimer","uid":"countdown-1","id":"countdown"}-->',
            }
          : {}),
      } as any,
    },
    attrs: options?.attrs,
    global: { stubs, directives: cmsDirectives },
  })
  // ClientOnly renders its slot only after mount.
  await flushPromises()
  return wrapper
}

describe('Storyblok CountdownTimerComponent', () => {
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
    const wrapper = await mountWith('small', undefined, {
      attrs: { class: 'mt-auto' },
    })

    expect(wrapper.find('[data-testid="small"]').classes()).toContain('mt-auto')
  })

  it('annotates the countdown so the Storyblok editor can highlight the blok', async () => {
    const wrapper = await mountWith('small', undefined, { editable: true })
    // Two async steps stand between mount and the editor attributes: ClientOnly
    // reveals its slot on mount, then v-editable awaits its dynamic
    // `@storyblok/js` import. Vue does not await directive hooks, so poll for
    // the result instead of assuming how many ticks those steps take.
    await vi.waitUntil(() =>
      wrapper.find('[data-testid="small"]').attributes('data-blok-c'),
    )

    const root = wrapper.find('[data-testid="small"]')
    expect(JSON.parse(root.attributes('data-blok-c')!)).toMatchObject({
      uid: 'countdown-1',
    })
    expect(root.attributes('data-blok-uid')).toBe('countdown-countdown-1')
    expect(root.classes()).toContain('storyblok__outline')
  })
})
