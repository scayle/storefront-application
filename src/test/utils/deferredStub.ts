import { defineComponent, h } from 'vue'

/**
 * Creates a stub component whose `setup` awaits a promise the test resolves, so
 * an enclosing `Suspense` stays pending until `resolve()` is called. A plain
 * template stub renders the same with or without a `Suspense` boundary, so only
 * a stub like this proves a parent wraps a block in one.
 *
 * @param label - Text the stub renders once resolved, inside an element with `data-testid="routed"`.
 * @returns The stub `component` and the `resolve` function that releases its `setup`.
 */
export const createDeferredStub = (label: string) => {
  const { promise: ready, resolve } = Promise.withResolvers<void>()
  const component = defineComponent({
    props: { contentElement: { type: Object, default: undefined } },
    async setup() {
      await ready
      return () => h('div', { 'data-testid': 'routed' }, label)
    },
  })
  return { component, resolve }
}
