import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CountdownTimerComponent from './CountdownTimerComponent.vue'

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
        sys: {
          id: 'test',
          contentType: { sys: { id: 'CountdownTimerComponent' } },
        },
        fields: {
          endDate: endDate ?? new Date(Date.now() + 60_000).toISOString(),
          size,
        },
      } as any,
    },
    attrs,
    global: { stubs },
  })
  // ClientOnly renders its slot only after mount.
  await flushPromises()
  return wrapper
}

describe('Contentful CountdownTimerComponent', () => {
  it('renders the large variant when size is "large"', async () => {
    const wrapper = await mountWith('large')
    expect(wrapper.find('[data-testid="large"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="small"]').exists()).toBe(false)
  })

  // An entry saved before the size field existed arrives without it.
  it.for(['small', undefined] as const)(
    'renders the small variant when size is %s',
    async (size) => {
      const wrapper = await mountWith(size)
      expect(wrapper.find('[data-testid="small"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="large"]').exists()).toBe(false)
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

  it('annotates the entry so the Contentful editor can highlight the field', async () => {
    const root = (await mountWith('small')).find('[data-testid="small"]')

    expect(root.attributes('data-contentful-entry-id')).toBe('test')
    expect(root.attributes('data-contentful-field-id')).toBe('endDate')
  })
})
