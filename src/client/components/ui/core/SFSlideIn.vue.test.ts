import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SFSlideIn from './SFSlideIn.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// Captures the router handlers so tests can fire Inertia events directly.
const routerHandlers = vi.hoisted(
  () => new Map<string, (event: unknown) => void>(),
)

vi.mock('@client/composables/useRouterEvent', () => ({
  useRouterEvent: (event: string, callback: (event: unknown) => void) => {
    routerHandlers.set(event, callback)
  },
}))

vi.mock('@client/composables/useDefaultBreakpoints', () => ({
  useDefaultBreakpoints: () => ({
    greaterOrEqual: () => ({ value: true }),
  }),
}))

vi.mock('@assets/icons/navigation/close.svg', () => ({
  default: {
    name: 'IconNavigationClose',
    template: '<svg />',
  },
}))

const SFSlideInTransitionStub = defineComponent({
  name: 'SFSlideInTransition',
  template: '<div data-testid="slide-in-transition-stub"><slot /></div>',
})

const globalMountConfig = {
  mocks: { $t: (key: string) => key },
  stubs: {
    SFSlideInTransition: SFSlideInTransitionStub,
  },
}

describe('SFSlideIn', () => {
  beforeEach(() => {
    routerHandlers.clear()
  })

  it('binds fallthrough attrs and class on the dialog, not the transition wrapper', () => {
    const wrapper = mount(SFSlideIn, {
      props: {
        isOpen: false,
        label: 'Shop selector',
      },
      attrs: {
        id: 'shop-switcher-dialog',
        'data-testid': 'shop-switcher-slide-in',
        class: 'custom-dialog-class',
      },
      global: globalMountConfig,
    })

    const dialog = wrapper.find('dialog')
    expect(dialog.attributes('id')).toBe('shop-switcher-dialog')
    expect(dialog.attributes('data-testid')).toBe('shop-switcher-slide-in')
    expect(dialog.classes()).toContain('custom-dialog-class')
    expect(
      wrapper.find('[data-testid="slide-in-transition-stub"]').attributes('id'),
    ).toBeUndefined()
  })

  it('closes the dialog when isOpen is false on mount', () => {
    const close = vi.spyOn(HTMLDialogElement.prototype, 'close')

    mount(SFSlideIn, {
      props: {
        isOpen: false,
        label: 'Panel',
      },
      global: globalMountConfig,
    })

    expect(close).toHaveBeenCalled()
  })

  it('sets aria-labelledby from the built-in heading when label is provided', () => {
    const wrapper = mount(SFSlideIn, {
      props: {
        isOpen: true,
        label: 'Shop selector',
      },
      global: globalMountConfig,
    })

    const dialog = wrapper.find('dialog')
    const headingId = wrapper.find('header p').attributes('id')
    expect(dialog.attributes('aria-labelledby')).toBe(headingId)
    expect(dialog.attributes('aria-modal')).toBe('true')
  })

  it('makes the dialog the focus delegate so no interior control is auto-focused', () => {
    const wrapper = mount(SFSlideIn, {
      props: {
        isOpen: true,
        label: 'Panel',
      },
      global: globalMountConfig,
    })

    const dialog = wrapper.find('dialog')
    expect(dialog.attributes('autofocus')).toBe('')
    expect(dialog.attributes('tabindex')).toBe('-1')

    const panel = wrapper.find('[data-testid="slide-in-panel"]')
    expect(panel.attributes('tabindex')).toBeUndefined()
    expect(panel.attributes('autofocus')).toBeUndefined()
  })

  describe('custom #header slot', () => {
    const mountWithCustomHeader = () =>
      mount(SFSlideIn, {
        props: {
          isOpen: true,
          labelledBy: 'custom-heading',
        },
        slots: {
          header: `
            <template #default="{ close, headingId }">
              <p id="custom-heading" :data-heading-id="headingId">Custom title</p>
              <button data-testid="custom-close" @click="close">Close</button>
            </template>
          `,
        },
        global: globalMountConfig,
      })

    it('renders the custom header in place of the built-in one', () => {
      const wrapper = mountWithCustomHeader()

      const headers = wrapper.findAll('header')
      expect(headers).toHaveLength(1)
      expect(headers[0]!.find('#custom-heading').text()).toBe('Custom title')
      expect(wrapper.find('[data-testid="slide-in-close"]').exists()).toBe(
        false,
      )
    })

    it('passes a heading id to the custom header', () => {
      const wrapper = mountWithCustomHeader()

      expect(
        wrapper.get('[data-heading-id]').attributes('data-heading-id'),
      ).toBeTruthy()
    })

    // A custom header owns the accessible name.
    it('names the dialog through labelledBy', () => {
      const wrapper = mountWithCustomHeader()

      expect(wrapper.get('dialog').attributes('aria-labelledby')).toBe(
        'custom-heading',
      )
    })

    it('lets the custom header close the panel', async () => {
      const wrapper = mountWithCustomHeader()

      await wrapper.get('[data-testid="custom-close"]').trigger('click')

      expect(wrapper.emitted('update:isOpen')?.at(-1)).toEqual([false])
    })
  })

  describe('closing on router events', () => {
    const fireBefore = (
      visit: Partial<{
        only: string[]
        except: string[]
        reset: string[]
        prefetch: boolean
      }> = {},
    ) =>
      routerHandlers.get('before')!({
        detail: {
          visit: { only: [], except: [], reset: [], prefetch: false, ...visit },
        },
      })

    const mountOpen = (closeOnRouteChange?: boolean) =>
      mount(SFSlideIn, {
        props: { isOpen: true, label: 'Filters', closeOnRouteChange },
        global: globalMountConfig,
      })

    it('closes when the user navigates to another page', () => {
      const wrapper = mountOpen()

      fireBefore()

      expect(wrapper.emitted('update:isOpen')?.at(-1)).toEqual([false])
    })

    // The panel's own content reloads props in place — a wishlist toggle on a
    // recommended product inside the add-to-basket panel, a filter change
    // inside the filter panel — and closing on that dismisses the panel
    // mid-interaction. `isPartialReload` tests which visits count as one.
    it('stays open through a partial reload', () => {
      const wrapper = mountOpen()

      fireBefore({ only: ['wishlist'] })

      expect(wrapper.emitted('update:isOpen')).toBeUndefined()
    })

    it('stays open on navigation when the panel opts out', () => {
      const wrapper = mountOpen(false)

      fireBefore()

      expect(wrapper.emitted('update:isOpen')).toBeUndefined()
    })

    // Inertia's `handlePopstateEvent` fires `navigate` and skips `before`, so a
    // panel listening only for `before` survives Back and covers the page the
    // user went to.
    it('closes when the user goes back in history', () => {
      const wrapper = mountOpen()

      window.dispatchEvent(new PopStateEvent('popstate'))

      expect(wrapper.emitted('update:isOpen')?.at(-1)).toEqual([false])
    })

    it('stays open on a history navigation when the panel opts out', () => {
      const wrapper = mountOpen(false)

      window.dispatchEvent(new PopStateEvent('popstate'))

      expect(wrapper.emitted('update:isOpen')).toBeUndefined()
    })
  })
})
