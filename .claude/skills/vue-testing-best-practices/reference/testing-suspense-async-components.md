---
title: Async Components in Inertia Deferred Props — Suspense Testing Pattern
impact: HIGH
impactDescription: Inertia deferred props and Suspense-wrapped components in SSR tests fail to render without proper async setup handling
type: gotcha
tags:
  [vue3, testing, suspense, async-setup, vue-test-utils, vitest, inertia, ssr]
---

# Testing Async Components in SSR Context

**Impact: HIGH** - Inertia deferred props and async setup components wrapped in `<Suspense>` fail to render in tests without a proper Suspense wrapper. This is particularly relevant when testing components that receive async data from Inertia shared data or deferred props.

When testing a component that depends on Inertia's deferred data or async setup, wrap it with a test `<Suspense>` component. Use `@vue/test-utils` `mount()` directly (not `@testing-library/vue`, which has known Suspense issues).

## When You Need This

- Testing a component that is wrapped in `<Inertia.defer>`
- Testing a page component that receives deferred props
- Testing any component with `async setup()` or `await` in `<script setup>`

**Pattern - Wrap with Test Suspense:**

```typescript
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, Suspense, h } from 'vue'
import AsyncComponent from './AsyncComponent.vue'

test('renders async content', async () => {
  const TestWrapper = defineComponent({
    render() {
      return h(Suspense, null, {
        default: () => h(AsyncComponent, { id: 1 }),
        fallback: () => h('div', 'Loading...'),
      })
    },
  })

  const wrapper = mount(TestWrapper)

  // Component is loading initially
  expect(wrapper.text()).toContain('Loading...')

  // Wait for async setup to complete
  await flushPromises()

  // Now the async component is rendered
  const component = wrapper.findComponent(AsyncComponent)
  expect(component.find('[data-testid="content"]').exists()).toBe(true)
})
```

Use `@vue/test-utils` `mount()` directly. Do NOT use `@testing-library/vue` for Suspense components—it has known issues with async setup.

## Reference

- [Vue Test Utils - Async Suspense](https://test-utils.vuejs.org/guide/advanced/async-suspense)
- [Vue.js Suspense Documentation](https://vuejs.org/guide/built-ins/suspense.html)
- [Inertia Deferred Docs](https://inertiajs.com/responses#deferred-props)
