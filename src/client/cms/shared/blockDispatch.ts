import type { Component } from 'vue'

/**
 * Extracts the type a component accepts on its `contentElement` prop, or
 * `never` when it has none.
 */
export type ContentElementOf<Candidate> = Candidate extends new () => {
  $props: { contentElement?: infer Payload }
}
  ? Payload
  : never

/**
 * One entry of a CMS provider's block dispatcher: the component that renders a
 * block type and whether it renders inside a `Suspense` boundary.
 *
 * Look entries up with `Object.hasOwn(BLOCKS, key)`, never `in` or a bare
 * index. A block whose key is `constructor` or `toString` would otherwise
 * resolve through the prototype chain instead of falling through to the
 * not-implemented message.
 *
 * A dispatcher declares its `defineAsyncComponent` wrappers in a plain
 * `<script>` block beside `<script setup>`, so every instance shares them. Keep
 * the block map inside `<script setup>`, never at module level: the section,
 * grid and accordion components import their dispatcher and the dispatcher
 * imports them, so a module-level map reads a component that is not initialized
 * yet whenever one of those loads first.
 */
export interface BlockEntry {
  component: Component
  /**
   * Whether to render inside a `Suspense` boundary. Set it to `true` when the
   * component's `setup` awaits at the top level, or when it is wrapped in
   * `defineAsyncComponent` and the boundary should cover its chunk load. A
   * component that awaits without a boundary renders nothing and Vue warns.
   */
  suspense: boolean
}

/**
 * Fails to compile when an entry's component cannot accept the payload of its
 * block type: the payload must be assignable to the component's
 * `contentElement` prop. A component whose props accept more than that payload
 * (for example all-optional props, as on `DividerComponent`) still passes, so
 * this catches a clearly wrong component, not every swap.
 *
 * Used in the parameter type of a provider's `defineBlocks`, which passes its
 * own block-type-to-payload map as `Payloads`.
 */
export type CheckedBlocks<Blocks, Payloads> = {
  [K in keyof Blocks]: K extends keyof Payloads & string
    ? Blocks[K] extends { component: infer C }
      ? [Payloads[K]] extends [ContentElementOf<C>]
        ? Blocks[K]
        : { component: `${K} component does not accept the ${K} payload` }
      : never
    : never
}
