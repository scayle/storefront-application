import { defineComponent, h } from 'vue'

/**
 * Stub for `SFAccountLayout` that renders only its default slot in a `div`.
 *
 * Account pages wrap their content in `SFAccountLayout`; tests that assert on
 * that inner content need the slot rendered without the layout's own chrome.
 * Shared here so a change to the stub only happens once.
 */
export const SFAccountLayoutStub = defineComponent({
  name: 'SFAccountLayout',
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})
