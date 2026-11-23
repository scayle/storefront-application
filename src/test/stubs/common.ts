/* eslint-disable vue/one-component-per-file -- shared stub module: intentionally groups related component stubs */
import { defineComponent, h, ref } from 'vue'
import type { Component } from 'vue'

/**
 * Cross-page component stubs shared by multiple page/component tests.
 */

/**
 * Stub for `SFButton`. Renders an anchor using the `to` prop as `href` so link
 * targets and CTA text can be asserted. Used wherever a test needs the button's
 * navigation target without mounting the real component.
 */
export const SFButtonStub: Component = defineComponent({
  name: 'SFButton',
  props: {
    to: { type: String, required: false, default: undefined },
  },
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

/**
 * Stub for `SFLink`. Renders an anchor using the `to` prop as `href`, without
 * the real link's country prefix and Inertia visit, so a test asserts the link
 * target it passed. Other attributes, such as `data-testid` or `aria-label`, fall
 * through to the anchor.
 */
export const SFLinkStub: Component = defineComponent({
  name: 'SFLink',
  props: {
    to: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

/**
 * Stub for `SFProductCard` used by focus-restoration tests. Renders a real,
 * focusable `<a>` per card and exposes `focus()` exactly like the real card
 * (`querySelector('a')`), so assertions run against `document.activeElement`
 * rather than a spy.
 */
export const FocusableProductCardStub: Component = defineComponent({
  name: 'SFProductCard',
  props: { product: { type: Object, required: true } },
  setup(props, { expose }) {
    const root = ref<HTMLElement | null>(null)
    expose({ focus: () => root.value?.querySelector('a')?.focus() })
    return () =>
      h('article', { ref: root }, [
        h(
          'a',
          {
            href: '#',
            'data-testid': `card-link-${(props.product as { id: number }).id}`,
          },
          'link',
        ),
      ])
  },
})
