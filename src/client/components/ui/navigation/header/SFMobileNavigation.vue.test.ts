import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { NavigationItem } from '@scayle/storefront/types'
import SFMobileNavigation from './SFMobileNavigation.vue'

const makeItem = (overrides: Partial<NavigationItem>): NavigationItem => ({
  id: 0,
  name: '',
  href: '',
  openInNewWindow: false,
  children: [],
  icon: undefined,
  linkColor: undefined,
  disabled: false,
  ...overrides,
})

const flatItem = makeItem({ id: 1, name: 'Home', href: '/' })
const categoryItem = makeItem({
  id: 3,
  name: 'Women',
  href: '/c/women',
  children: [
    makeItem({
      id: 31,
      name: 'Dresses',
      children: [
        makeItem({
          id: 311,
          name: 'Evening',
          href: '/c/women/dresses/evening',
        }),
      ],
    }),
    makeItem({ id: 32, name: 'Tops', href: '/c/women/tops' }),
  ],
})

const globalConfig = {
  stubs: {
    SFLink: {
      props: ['to'],
      template: '<a :href="to" data-testid="nav-link"><slot /></a>',
    },
    SFButton: {
      emits: ['click'],
      template:
        '<button data-testid="sf-button" @click="$emit(\'click\', $event)"><slot /><slot name="append-icon" /></button>',
    },
    SFNavigationTreeItem: {
      props: ['navigationItem'],
      template: '<span class="tree-item">{{ navigationItem.name }}</span>',
    },
    IconNavigationRight: { template: '<span />' },
    IconNavigationLeft: { template: '<span />' },
    IconIncrementPlus: { template: '<span />' },
    IconIncrementMinus: { template: '<span />' },
  },
  mocks: {
    $t: (key: string) => key,
  },
}

describe('SFMobileNavigation', () => {
  it('renders a direct link to the landing page for a top-level item with children', () => {
    const wrapper = mount(SFMobileNavigation, {
      props: { isOpen: true, navigationItems: [categoryItem] },
      global: globalConfig,
    })

    const link = wrapper.get('[data-testid="nav-link"]')
    expect(link.attributes('href')).toBe('/c/women')
    // The link and the sub-menu toggle are separate, independent controls.
    expect(wrapper.find('[data-testid="sf-button"]').exists()).toBe(true)
  })

  it('opens the sub-navigation panel when the toggle button is clicked', async () => {
    const wrapper = mount(SFMobileNavigation, {
      props: { isOpen: true, navigationItems: [categoryItem] },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="mobile-nav-accordion"]').exists()).toBe(
      false,
    )

    await wrapper.get('[data-testid="sf-button"]').trigger('click')

    // Sub-panel for "Women" is now shown, exposing its grouped children.
    expect(wrapper.find('[data-testid="mobile-nav-accordion"]').exists()).toBe(
      true,
    )
  })

  it('renders a link for a top-level item without children', () => {
    const wrapper = mount(SFMobileNavigation, {
      props: { isOpen: true, navigationItems: [flatItem] },
      global: globalConfig,
    })

    const link = wrapper.get('[data-testid="nav-link"]')
    expect(link.attributes('href')).toBe('/')
  })

  it('runs the panel transition as a single simultaneous slide', () => {
    const wrapper = mount(SFMobileNavigation, {
      props: { isOpen: true, navigationItems: [categoryItem] },
      global: {
        ...globalConfig,
        stubs: {
          ...globalConfig.stubs,
          transition: {
            inheritAttrs: false,
            template:
              '<div :data-mode="$attrs.mode" :data-leave-active="$attrs[\'leave-active-class\']"><slot /></div>',
          },
        },
      },
    })

    const transition = wrapper.get('[data-leave-active]')
    expect(transition.attributes('data-mode')).toBeUndefined()
    expect(transition.attributes('data-leave-active')).toContain('absolute')
  })

  // Clicking a top-level link must close the sidebar even when navigation is a
  // no-op (e.g. the current page already is that category), so it cannot rely on
  // the router 'before' event firing.
  it('emits clickLink when a top-level link is tapped', async () => {
    const wrapper = mount(SFMobileNavigation, {
      props: { isOpen: true, navigationItems: [categoryItem, flatItem] },
      global: globalConfig,
    })

    const links = wrapper.findAll('[data-testid="nav-link"]')
    await links[0]!.trigger('click')
    await links[1]!.trigger('click')

    expect(wrapper.emitted('clickLink')).toHaveLength(2)
  })

  describe('sub-navigation panel', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    const mountOpenPanel = async () => {
      const wrapper = mount(SFMobileNavigation, {
        props: { isOpen: true, navigationItems: [categoryItem] },
        global: globalConfig,
        attachTo: document.body,
      })
      await wrapper
        .get('[aria-label="navigation.a11y.show_subcategories"]')
        .trigger('click')
      await flushPromises()
      return wrapper
    }

    it('moves focus to the back button when the panel opens', async () => {
      await mountOpenPanel()

      expect(document.activeElement?.getAttribute('aria-label')).toBe(
        'navigation.a11y.back_to_main_menu',
      )
    })

    it('returns to the main list when the back button is clicked', async () => {
      const wrapper = await mountOpenPanel()

      await wrapper
        .get('[aria-label="navigation.a11y.back_to_main_menu"]')
        .trigger('click')

      expect(
        wrapper.find('[data-testid="mobile-nav-accordion"]').exists(),
      ).toBe(false)
      expect(wrapper.get('[data-testid="nav-link"]').attributes('href')).toBe(
        '/c/women',
      )
    })

    it('returns focus to the toggle of the closed panel when the back button is clicked', async () => {
      const menItem = makeItem({
        id: 4,
        name: 'Men',
        href: '/c/men',
        children: [makeItem({ id: 41, name: 'Shoes', href: '/c/men/shoes' })],
      })
      const wrapper = mount(SFMobileNavigation, {
        props: { isOpen: true, navigationItems: [categoryItem, menItem] },
        global: globalConfig,
        attachTo: document.body,
      })
      const toggles = () =>
        wrapper.findAll('[aria-label="navigation.a11y.show_subcategories"]')

      await toggles()[1]!.trigger('click')
      await flushPromises()
      await wrapper
        .get('[aria-label="navigation.a11y.back_to_main_menu"]')
        .trigger('click')
      await flushPromises()

      expect(document.activeElement).toBe(toggles()[1]!.element)
    })

    it('expands and collapses a subgroup through its accordion button', async () => {
      const wrapper = await mountOpenPanel()
      const accordion = wrapper.get('[data-testid="mobile-nav-accordion"]')
      const panel = wrapper.get(`#${accordion.attributes('aria-controls')}`)
      expect(accordion.attributes('aria-expanded')).toBe('false')
      expect(panel.isVisible()).toBe(false)

      await accordion.trigger('click')
      expect(accordion.attributes('aria-expanded')).toBe('true')
      expect(panel.isVisible()).toBe(true)

      await accordion.trigger('click')
      expect(accordion.attributes('aria-expanded')).toBe('false')
    })

    it('resets to the main list after the sidebar closes', async () => {
      vi.useFakeTimers()
      const wrapper = await mountOpenPanel()

      await wrapper.setProps({ isOpen: false })
      vi.runAllTimers()
      await flushPromises()

      expect(
        wrapper.find('[data-testid="mobile-nav-accordion"]').exists(),
      ).toBe(false)
    })
  })

  it.for([
    { item: flatItem, openInNewWindow: true, target: '_blank' },
    { item: flatItem, openInNewWindow: false, target: '_self' },
    { item: categoryItem, openInNewWindow: true, target: '_blank' },
    { item: categoryItem, openInNewWindow: false, target: '_self' },
  ])(
    'sets target $target on the top-level $item.name link when openInNewWindow is $openInNewWindow',
    ({ item, openInNewWindow, target }) => {
      const wrapper = mount(SFMobileNavigation, {
        props: {
          isOpen: true,
          navigationItems: [{ ...item, openInNewWindow }],
        },
        global: globalConfig,
      })

      expect(wrapper.get('[data-testid="nav-link"]').attributes('target')).toBe(
        target,
      )
    },
  )
})
