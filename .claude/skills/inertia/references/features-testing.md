---
name: inertia-features-testing
description: Mocking @inertiajs/vue3 in component tests with vi.mock and usePage
---

# Testing

Component tests that use `usePage()` mock the whole `@inertiajs/vue3` module rather than mounting a real Inertia app around the component under test — there's no router or server round-trip to simulate, just the page object the component reads from.

## Mocking `usePage`

```ts
import * as inertia from '@inertiajs/vue3'
import { describe, it, vi, beforeEach } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: vi.fn(),
}))

describe('SomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with the given page props', () => {
    vi.mocked(inertia.usePage).mockReturnValue({
      props: { cmsEditorData: undefined /* whatever the component reads */ },
    } as any)

    const wrapper = mount(SomePage, { props: {/* component's own props */} })
    // assertions...
  })
})
```

- `vi.mock('@inertiajs/vue3', () => ({ usePage: vi.fn() }))` at module scope replaces the whole module — only mock the exports the component under test actually imports (usually just `usePage`; add `router` or others only if the component calls them).
- The mocked return value is cast `as any` because tests only need to stub the specific `props` keys the component reads, not satisfy Inertia's full `Page` type.
- Reset the mock between tests (`vi.clearAllMocks()` in `beforeEach`) so one test's `mockReturnValue` doesn't leak into the next.
- This pattern covers **prop wiring** (does the component read and render the right page prop) — it does not exercise real Inertia behavior (navigation, partial reloads, deferred prop resolution). Testing those would need a different setup; nothing in this codebase currently does, since router-level behavior lives in shared composables/utilities rather than being re-tested per component.
