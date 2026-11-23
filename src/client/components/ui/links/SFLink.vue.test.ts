import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import SFLink from './SFLink.vue'

vi.mock('@inertiajs/vue3', () => ({
  Link: {
    template: '<a v-bind="$attrs" data-inertia><slot /></a>',
    inheritAttrs: false,
  },
  router: {
    prefetch: vi.fn(),
  },
}))

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({
    path: ref('/'),
    query: ref(new URLSearchParams()),
    baseUrl: ref('https://example.com'),
    fullPath: ref('https://example.com/'),
    hash: ref(''),
  }),
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: {
      value: { config: { countrySelector: 'path' }, country: { path: 'de' } },
    },
    country: { value: { path: 'de' } },
  }),
}))

describe('SFLink', () => {
  it('exposes a single element root ($el is an Element node)', () => {
    const internal = mount(SFLink, { props: { to: '/path' } })
    expect(internal.element.nodeType).toBe(1)

    const external = mount(SFLink, {
      props: { to: 'https://other.example.com' },
    })
    expect(external.element.nodeType).toBe(1)
  })

  it('renders absolute same-origin links as a hard navigation (native anchor)', () => {
    // A shop switch points at an absolute, same-domain URL. It must navigate
    // hard (full reload) so the app reboots onto the new shop, not an Inertia
    // XHR visit that leaves shop-scoped state on the previous shop.
    const wrapper = mount(SFLink, {
      props: { to: 'https://example.com/de' },
    })

    const anchor = wrapper.find('a')
    expect(anchor.attributes('data-inertia')).toBeUndefined()
    expect(anchor.attributes('href')).toBe('https://example.com/de')
  })

  it.for<{ case: string; props: InstanceType<typeof SFLink>['$props'] }>([
    { case: 'target is _self', props: { to: '/path', target: '_self' } },
    { case: 'target is absent', props: { to: '/path' } },
  ])('renders an Inertia link without rel when $case', ({ props }) => {
    const anchor = mount(SFLink, { props }).find('a')

    expect(anchor.attributes('data-inertia')).toBeDefined()
    expect(anchor.attributes('rel')).toBeUndefined()
  })

  it('prefixes an internal link with the country path', () => {
    const wrapper = mount(SFLink, { props: { to: '/path' } })

    expect(wrapper.find('a').attributes('href')).toBe('/de/path')
  })

  it('respects an explicit rel override', () => {
    const wrapper = mount(SFLink, {
      props: { to: 'https://example.com', target: '_blank', rel: 'nofollow' },
    })

    const anchor = wrapper.find('a')
    expect(anchor.attributes('data-inertia')).toBeUndefined()
    expect(anchor.attributes('rel')).toBe('nofollow')
  })

  it('allows clearing rel explicitly with an empty string', () => {
    const wrapper = mount(SFLink, {
      props: { to: 'https://example.com', target: '_blank', rel: '' },
    })

    const anchor = wrapper.find('a')
    expect(anchor.attributes('data-inertia')).toBeUndefined()
    expect(anchor.attributes('rel')).toBe('')
  })

  it('renders cross-origin links with href, external target, and default rel', () => {
    const wrapper = mount(SFLink, {
      props: {
        to: 'https://other.example.com/help',
        target: '_blank',
      },
    })

    const anchor = wrapper.find('a')
    expect(anchor.attributes('data-inertia')).toBeUndefined()
    expect(anchor.attributes('href')).toBe('https://other.example.com/help')
    expect(anchor.attributes('target')).toBe('_blank')
    expect(anchor.attributes('rel')).toBe('noopener noreferrer')
  })

  // The underline tells a link apart from the text around it without relying
  // on color alone.
  it('underlines the link when raw is false', () => {
    const wrapper = mount(SFLink, {
      props: { to: '/path' },
    })

    expect(wrapper.find('a').classes()).toContain('underline')
  })

  it('renders no classes of its own when raw is true', () => {
    const wrapper = mount(SFLink, {
      props: { to: '/path', raw: true },
    })

    expect(wrapper.find('a').classes()).toEqual([])
  })

  it('marks disabled links with aria-disabled and blocks click', async () => {
    const wrapper = mount(SFLink, {
      props: { to: '/path', disabled: true },
    })

    const anchor = wrapper.find('a')
    expect(anchor.attributes('aria-disabled')).toBe('true')
    expect(anchor.attributes('tabindex')).toBe('-1')

    await anchor.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  describe('prefetch on pointer press', () => {
    it('calls router.prefetch on pointerdown when prefetchOnPress is true', async () => {
      const { router } = await import('@inertiajs/vue3')
      const wrapper = mount(SFLink, {
        props: { to: '/path', prefetchOnPress: true },
      })

      const anchor = wrapper.find('a')
      await anchor.trigger('pointerdown')

      expect(router.prefetch).toHaveBeenCalledOnce()
      // Link is localized by localizeLink (country code 'de' added)
      expect(router.prefetch).toHaveBeenCalledWith('/de/path', {
        method: 'get',
      })
    })

    it.each<{
      case: string
      props: InstanceType<typeof SFLink>['$props']
    }>([
      {
        case: 'target is not _self (Inertia never intercepts those clicks)',
        props: { to: '/path', prefetchOnPress: true, target: '_blank' },
      },
      {
        case: 'prefetchOnPress is false',
        props: { to: '/path', prefetchOnPress: false },
      },
      {
        case: 'prefetchOnPress is absent',
        props: { to: '/path' },
      },
      {
        case: 'the link is a hard navigation (absolute URL)',
        props: { to: 'https://example.com/de', prefetchOnPress: true },
      },
      {
        case: 'the link is protocol-relative external (isExternal branch)',
        props: { to: '//evil.com', prefetchOnPress: true },
      },
      {
        case: 'disabled is true',
        props: { to: '/path', prefetchOnPress: true, disabled: true },
      },
    ])('does not call router.prefetch when $case', async ({ props }) => {
      const { router } = await import('@inertiajs/vue3')
      const wrapper = mount(SFLink, { props })

      const anchor = wrapper.find('a')
      await anchor.trigger('pointerdown')

      expect(router.prefetch).not.toHaveBeenCalled()
    })
  })

  describe('fallthrough attributes', () => {
    it('forwards role, aria-checked, and data attributes to inertia links', () => {
      const wrapper = mount(SFLink, {
        props: { to: '/path', raw: true },
        attrs: {
          role: 'radio',
          'aria-checked': true,
          'data-sibling-index': 2,
        },
      })

      const anchor = wrapper.find('a')
      expect(anchor.attributes('data-inertia')).toBeDefined()
      expect(anchor.attributes('role')).toBe('radio')
      expect(anchor.attributes('aria-checked')).toBe('true')
      expect(anchor.attributes('data-sibling-index')).toBe('2')
    })

    it('forwards fallthrough attributes on external links', () => {
      const wrapper = mount(SFLink, {
        props: { to: 'https://other.example.com/help', raw: true },
        attrs: { role: 'radio', 'aria-checked': false },
      })

      const anchor = wrapper.find('a')
      expect(anchor.attributes('data-inertia')).toBeUndefined()
      expect(anchor.attributes('role')).toBe('radio')
      expect(anchor.attributes('aria-checked')).toBe('false')
    })

    it('applies numeric and string tabindex from fallthrough attrs', () => {
      const withNumber = mount(SFLink, {
        props: { to: '/path', raw: true },
        attrs: { tabindex: 0 },
      })
      expect(withNumber.find('a').attributes('tabindex')).toBe('0')

      const withString = mount(SFLink, {
        props: { to: '/path', raw: true },
        attrs: { tabindex: '-1' },
      })
      expect(withString.find('a').attributes('tabindex')).toBe('-1')
    })

    it('omits tabindex when the fallthrough value is not number or string', () => {
      const wrapper = mount(SFLink, {
        props: { to: '/path', raw: true },
        attrs: { tabindex: { invalid: true } },
      })

      expect(wrapper.find('a').attributes('tabindex')).toBeUndefined()
    })

    it('maps fallthrough aria-disabled when the disabled prop is false', () => {
      const wrapper = mount(SFLink, {
        props: { to: '/path', raw: true, disabled: false },
        attrs: { 'aria-disabled': true },
      })

      expect(wrapper.find('a').attributes('aria-disabled')).toBe('true')
    })

    it('lets the disabled prop override fallthrough tabindex and aria-disabled', () => {
      const wrapper = mount(SFLink, {
        props: { to: '/path', disabled: true },
        attrs: { tabindex: 0, 'aria-disabled': false },
      })

      const anchor = wrapper.find('a')
      expect(anchor.attributes('tabindex')).toBe('-1')
      expect(anchor.attributes('aria-disabled')).toBe('true')
    })

    it('adds a fallthrough class to the default link classes', () => {
      const defaultClasses = mount(SFLink, { props: { to: '/path' } })
        .find('a')
        .classes()

      const wrapper = mount(SFLink, {
        props: { to: '/path' },
        attrs: { class: 'shop-link' },
      })

      expect(wrapper.find('a').classes()).toEqual([
        ...defaultClasses,
        'shop-link',
      ])
    })

    it('emits click when enabled and fallthrough attrs include role radio', async () => {
      const wrapper = mount(SFLink, {
        props: { to: '/path', raw: true },
        attrs: { role: 'radio', tabindex: 0 },
      })

      await wrapper.find('a').trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })
})
