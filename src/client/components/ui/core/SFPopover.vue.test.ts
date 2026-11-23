import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SFPopover from './SFPopover.vue'

const slots = {
  action: '<button data-testid="action">open</button>',
  content: '<div data-testid="inner">content</div>',
}

const mountPopover = async (props: Record<string, unknown> = {}) => {
  const wrapper = mount(SFPopover, { props, slots })
  // `ClientOnly` flips in after the mount hook.
  await nextTick()
  return wrapper
}

describe('SFPopover', () => {
  it('forwards mouseenter and mouseleave from the root', async () => {
    const wrapper = await mountPopover()
    await wrapper.get('[data-testid="popoverContainer"]').trigger('mouseenter')
    await wrapper.get('[data-testid="popoverContainer"]').trigger('mouseleave')

    expect(wrapper.emitted('mouseenter')).toHaveLength(1)
    expect(wrapper.emitted('mouseleave')).toHaveLength(1)
  })

  describe('keepMounted = false (v-if path)', () => {
    it('does not render the content while closed', async () => {
      const wrapper = await mountPopover({ isOpen: false })
      expect(wrapper.find('[data-testid="popover-content"]').exists()).toBe(
        false,
      )
    })

    it('mounts the content when opened', async () => {
      const wrapper = await mountPopover({ isOpen: true })
      const content = wrapper.get('[data-testid="popover-content"]')
      expect(content.find('[data-testid="inner"]').exists()).toBe(true)
      expect(content.attributes('hidden')).toBeUndefined()
    })
  })

  describe('keepMounted = true (hidden/inert path)', () => {
    it('keeps the content in the DOM while closed, hidden and inert', async () => {
      const wrapper = await mountPopover({ isOpen: false, keepMounted: true })
      const content = wrapper.get('[data-testid="popover-content"]')

      expect(content.find('[data-testid="inner"]').exists()).toBe(true)
      expect(content.attributes('hidden')).toBe('')
      expect(content.attributes('inert')).toBe('')
    })

    it('drops hidden and inert when opened', async () => {
      const wrapper = await mountPopover({ isOpen: true, keepMounted: true })
      const content = wrapper.get('[data-testid="popover-content"]')

      expect(content.attributes('hidden')).toBeUndefined()
      expect(content.attributes('inert')).toBeUndefined()
    })
  })
})
