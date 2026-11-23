---
name: storybook-vue-stories
description: Creates and updates Storybook stories for Vue components following project conventions: file structure, meta and JSDoc, story naming and variants, args and argTypes, render functions, play functions, mock data, and existing config and mocks (Inertia, oRPC). Use when creating or editing .stories.ts files, when the user asks to add or update a Storybook story, when working on Storybook config or mocks, or when working on Storybook for Vue components.
---

# Storybook Story Guidelines for Vue Components

This skill is the source of truth for stories in this repository. Storybook's own `storybook skills write-story` is generic: where it differs from this skill, follow this skill.

## Storybook v10 and Vue 3

- **Framework and imports:** Use Storybook 10 with the Vue 3 Vite framework. Import types from `@storybook/vue3-vite`: `Meta`, `StoryObj`, `ComponentPropsAndSlots`.
- **Preview setup:** Global Vue app config (plugins, components, directives) belongs in `.storybook/preview.ts` using `setup()` from `@storybook/vue3-vite`. See existing `.storybook/preview.ts` (i18n, notification plugin, `beforeEach` with `mocked(usePage)`).
- **Render functions:** Use the Composition API `setup()` pattern in story render functions. Return `{ args }` from `setup()` and use a template that binds with `v-bind="args"`. Use `ComponentPropsAndSlots<typeof ComponentName>` for type-safe render signatures (as in `SFButton.stories.ts`).
- **Play and testing:** Use `fn` from `storybook/test` for action mocks. Play functions are covered in "Interactive Stories and Play Functions".
- **Docgen:** `.storybook/main.ts` enables the server-side docgen engine (`features.experimentalDocgenServer`). Document props in the component file with JSDoc in `defineProps` / `defineEmits` / `defineSlots`; keep story authoring consistent with docgen.

## Finding Components and Their Stories

`storybook tools` reads the Storybook configuration and story index directly, so it needs no running Storybook. Run it from the application directory:

- `pnpm exec storybook tools docs list` lists every component that has stories, with its ID and the start of the meta JSDoc. Add `--withStoryIds` for the story IDs. Take IDs from this list instead of guessing them from a title.
- `pnpm exec storybook tools docs show --id <id>` prints a component's prop types with their JSDoc and the code of its first three stories. Run it for every component a new story renders, before writing the story, instead of reading the props from the source or guessing them. A component without stories is not in the index: read its `defineProps` JSDoc instead.
- `pnpm exec storybook tools stories find-by-component --componentPaths '["src/client/components/ui/core/SFCountBadge.vue"]'` lists the stories that render a component, grouped by import distance: 1 for stories that import it directly, usually its own, and 2 and higher for stories of components that use it. It stops at distance 3 unless you pass a higher `--maxDistance`. `--componentPaths` takes a JSON array, also for one file. Run it after changing a component, to know which stories to check.
- `pnpm exec storybook tools stories changed` lists the stories that the uncommitted changes in the working tree add, change, or affect.

## Config and mocks (Inertia, oRPC)

Storybook runs the Vue app in isolation. The backend (Hono + oRPC) is not running, so config and mocks determine what components see.

**Existing config:**

- **`.storybook/main.ts`:** Stories `./content/GettingStarted.mdx` and `../src/client/**/*.stories.ts`, addons (a11y, docs), framework `@storybook/vue3-vite`, and `staticDirs: ['assets']`, which serves `.storybook/assets/`. `viteFinal` adds a resolve alias: `@inertiajs/vue3` → `.storybook/inertia-mock.ts`, so all Inertia imports in the app resolve to the mock in Storybook.
- **`.storybook/preview.ts`:** `setup()` registers i18n and the notification plugin. The `locale` toolbar global sets the i18n locale; a story pins one with `globals: { locale: 'de-DE' }`. `beforeEach` uses `mocked(usePage).mockReturnValue(page)` to provide a full page object (url, props.storefront with country and config, version, scrollRegions, etc.). Use this shape when a story or decorator needs a custom `usePage()` return value; extend or override the default `page` in that story's decorators or in `beforeEach` for global overrides.
- **Module mocks:** register a module mock with `sb.mock(import('...'))` in `.storybook/preview.ts`. Storybook accepts `sb.mock` only in the preview file, and Vitest's `vi.mock` does not apply to stories. Import a local module by its relative path with the file extension, not through an alias such as `@client/*`. `preview.ts` mocks the Storyblok media module with `{ spy: true }` and sets `createStoryblokSources` in `beforeEach`. A story changes what it returns with `mocked(createStoryblokSources).mockReturnValue(...)` from `storybook/test` in its own `beforeEach`.

**Inertia mock (`.storybook/inertia-mock.ts`):**

- Exports `usePage` (as `fn()` from `storybook/test`), `Link`, `Head`, `Deferred`, `useRemember`, `createInertiaApp`, and `router` (visit, get, post, put, patch, delete, reload, replace, replaceProp, prefetch, on, off as `fn()`). `reload` calls the `onFinish` option, so a partial reload after a mutation resolves. Every name the client imports from `@inertiajs/vue3` must exist here, or a story that reaches the import fails to build. The real `usePage()` return value is set in `preview.ts` `beforeEach`; the mock's default is overridden there with a full `StorefrontContext`-style object, including `customer: null` (a signed-out user).
- A component that navigates through `useRoute().navigate` (sorting, filters) calls the mocked `router.visit`, so nothing changes on screen. To show the result, keep the state in the story and update it from `createVisitClaim` (exported from `inertia-mock.ts`): bind the returned function to `@pointerdown.capture` and `@keydown.capture` on a wrapper, so the story the user interacts with receives the visited URL. See `src/client/components/sorting/SFSortSelection.stories.ts`.
- `<Deferred>` renders `#fallback` until every key in `data` is defined on `usePage().props`. To show the loading state, leave the prop `undefined` in the story's `usePage()` mock; see `CustomerLoading` in `src/client/components/wishlist/SFEmptyWishlist.stories.ts`.

**RPC client (oRPC):**

- Composables call the oRPC procedures through `useRpcClient()`, which injects the client under `RPC_CLIENT_KEY`. `preview.ts` provides `storybookRpcClient` from `.storybook/rpc-mock.ts` there.
- `storybookRpcClient` is typed as `RpcClient` and answers every procedure with a success, so a story can use any basket, wishlist, search or auth control without an error. A procedure added to or renamed in the router fails typecheck until the mock is updated.
- Mutations have no visible effect: the mocked `router.reload` finishes without a request, so page props never come back changed. Drive the state you want to show through props or the `usePage()` return value instead.
- **Overriding a procedure in one story:** provide a client in a decorator that spreads `storybookRpcClient` and replaces one namespace. Wrap the output in `succeed` from `rpc-mock.ts` so it matches the safe client. `SFSearchField.stories.ts` is the worked example.
- **Failing a procedure in one story:** answer with `fail(code)` from `rpc-mock.ts`. It marks the error `defined`, as the client sees an error the procedure declares in `.errors()`. For a procedure without that error in `.errors()`, pass `fail(code, { defined: false })`, so the story only shows results the router can produce. `SFProfilePasswordManagement.stories.ts` (`WrongCurrentPassword`) and `SFProfilePersonalInformation.stories.ts` (`UpdateFailed`) are the worked examples.
- **Signed-in customer:** `preview.ts` sets `customer` to `null`. Call `signInAs(storybookCustomer)` from `rpc-mock.ts` in `beforeEach` instead of overriding `usePage()` by hand.

**When writing or updating stories:**

- Rely on the existing Inertia mock and `preview.ts` page shape; don't re-mock Inertia in individual stories unless you need a different page for that story.
- For components that use `usePage()`: the default `beforeEach` already provides a valid storefront context; use it or override via decorators/parameters if the story needs a different locale, country, or config.
- For components that use the RPC client: the global mock already answers every procedure. Override a procedure in a decorator only when the story needs a specific response, and do not add a second mock module.

## File Structure and Naming

- Place each component's stories file (`.stories.ts`) next to the component file for easy discoverability
- Use the component's name as the story file name, e.g., `SFButton.vue` → `SFButton.stories.ts`
- Use TypeScript (`.stories.ts`) for all story files

## Meta Definition and Documentation

- End the default export with `satisfies Meta<typeof ComponentName>`, so a misspelled prop or a wrong arg type fails typecheck. See "TypeScript Usage" for the `Story` type, generic components and story args that differ from the props
- The CMS block stories under `src/client/cms/`, `src/client/Icons.stories.ts` and the two `image-view` selection stories have no `satisfies Meta` yet. Don't copy their bare `export default {` into a new story file
- Add a comprehensive JSDoc comment directly above the `export default` meta definition
- The JSDoc should describe:
  - The component's purpose and primary use cases
  - Key features and capabilities
  - Notable behaviors or implementation details
  - Usage context and examples when helpful
- **Add JSDoc comments above individual story exports** to explain what each story demonstrates
- Story JSDoc should describe the specific scenario, state, or use case being shown
- Set the `title` property to mirror the file's path under `components/`, as described in `src/client/CLAUDE.md` (e.g., `"UI/Core/SFButton"`, `"Product/Detail/Product Gallery/SFProductGallery"`, `"CMS Storyblok/Button"`)

## Component Props Documentation

- Document each prop with JSDoc directly inside the `defineProps` block in the component file (following the `SFButton` style)
- JSDoc comments should explain the prop's purpose, behavior, and usage context
- Props are documented in the component file, not in the story file
- If a prop comment doesn't add information beyond the prop name, omit it
- JSDoc in `defineProps` / `defineEmits` / `defineSlots` drives the auto-generated controls and docs

## Story Naming and Organization

- Name stories clearly to reflect the state, variant, or use case they represent
- Use PascalCase for story names (e.g., `Primary`, `WithIcon`, `Loading`, `MultipleImages`, `ButtonWithAppendedIcon`)
- Simple names like `Default` are acceptable when they represent the most common or basic usage
- Use descriptive names that indicate the story's purpose (e.g., `ButtonWithAppendedIcon`, `PreSelected`, `ChipGroup`, `WithAppendIcon`)
- Names should be self-explanatory and help developers quickly understand what the story demonstrates

## Story Variants - When to Add Them

- **Only add story variants** if they show meaningful visual or functional differences based on real-world use cases
- Examples of good variants:
  - A `PromotionCard` with types like `"discount"`, `"bonus"`, or `"expired"` that display different layouts or visuals
  - A `TabNavigation` with selected/unselected states showing different behaviors
  - A `SFButton` with different variants (Primary, Secondary, Raw) that have distinct visual styles
  - A `SFProductCard` with different states (Sale, Campaign, Promotions) that show different badges or pricing
- **Do not** add variants that cannot be visually or functionally distinguished in Storybook
- **Do not** create variants for prop toggles that don't result in UI changes
- Each story should showcase a single, clear use case or state of the component
- Before you finish, check the component against these states and add a story for each one it renders differently:
  - **Loading:** leave the deferred prop `undefined` in the `usePage()` mock (see `<Deferred>` under "Inertia mock")
  - **Empty:** no items, for example an empty basket, wishlist or result list
  - **Error:** answer the procedure with `fail(code)` from `rpc-mock.ts` (see "Failing a procedure in one story")
  - **User vs customer:** the default is a signed-out user; for a signed-in customer, see "Signed-in customer"
  - **Invalid input:** a play function enters an invalid value and asserts the validation message

## Args and Default Values

- Use the `args` property to define default props for each story
- Provide realistic, meaningful default values that demonstrate the component's behavior
- For complex objects (like products), use the mock-data factories (e.g., `createMockListingProduct()`) to create test data
- Use TypeScript type assertions when necessary (e.g., `as CentAmount`, `as CampaignType`)

## ArgTypes Configuration

- Configure `argTypes` in the meta definition to improve Storybook controls and documentation
- Define `argTypes` manually when:
  - A prop accepts a fixed set of values (use `control: { type: 'select' }` or `control: 'select'` with `options`)
  - The automatically generated controls don't match the intended usage
  - You want to provide better descriptions for complex props
- Both `control: { type: 'select' }` (object notation) and `control: 'select'` (string) are valid - use consistently within a file
- Use `options: Object.values(EnumType)` for enum props
- Add `description` fields to argTypes for props that need additional context
- For event handlers, use `action: 'event-name'` with descriptive `description` fields
- For CMS components with complex data structures, you may need custom interfaces and argTypes that map to nested properties

## Render Functions

- Use the `render` function in the meta definition to provide a consistent template wrapper for all stories
- Use `ComponentPropsAndSlots<typeof ComponentName>` from `@storybook/vue3-vite` for type safety in render functions
- The render function must use Vue 3 Composition API `setup()` pattern: return an object with `components`, `setup()` (returning `{ args }`), and `template` that uses `v-bind="args"`
- Include necessary wrapper elements or classes for proper visual presentation (e.g., container classes, spacing)
- For stories that need custom templates (e.g., slots, complex layouts, multiple components), override the `render` function in individual stories
- Use `ref()` from Vue when you need reactive state in render functions (e.g., for `v-model` bindings)
- For CMS components, you may need computed properties to transform args into the expected component props

## TypeScript Usage

- Use types from `@storybook/vue3-vite` only; do not mix with other Storybook packages for Vue
- Below the meta, define `type Story = StoryObj<typeof ComponentName>` and annotate every story export with it: `export const StoryName: Story = { ... }`. Some files use `{ ... } satisfies Story` instead, which checks the same; keep one form per file
- Generic components (`<script setup lang="ts" generic="T">`) cannot satisfy `Meta<typeof ComponentName>`, because Storybook types `component` in a way a generic component does not match. Define a local meta type and satisfy that instead, as in `src/client/components/ui/core/SFChip.stories.ts`. Arg value types are still checked, but an unknown arg name is not:

  ```ts
  type SFChipMeta = Omit<Meta<typeof SFChip>, 'component'> & {
    component: typeof SFChip
  }
  ```

- When the story args differ from the component props (for example extra args a story maps onto props), define a story args type, satisfy `Meta<StoryArgs>` and use `StoryObj<StoryArgs>`, as in `src/client/components/account/orders/SFAccountOrderCard.stories.ts`
- Rely on TypeScript's type inference where possible, but be explicit for complex types

## Interactive Stories and Play Functions

- Add a `play` function to a story for interactive demonstrations
- Take `canvas` and `userEvent` from the play context, and import only `expect` (plus `waitFor` or `fn` when the story needs them) from `storybook/test`. `canvas` is the story root wrapped in Testing Library queries, so it replaces `within(canvasElement)`
- Assert the visible outcome of every interaction: the text, state or attribute a user sees or a screen reader announces (`aria-expanded`, `aria-current`, a validation message). A play function that only clicks shows the interaction but tests nothing. When the interaction only emits an event, the `fn()` assertion below is the outcome
- Query by role, label or visible text (`getByRole('button', { name: ... })`, `getByLabelText`, `getByText`), the way a user finds the element, not by CSS class, tag or `data-testid`
- Older stories, such as `CustomerLoading` in `SFEmptyWishlist.stories.ts`, still query with `within(canvasElement)` and `getByTestId`. Leave them as they are, but don't copy either into a new story
- When a story passes `fn()` args (`onClose: fn()`), assert the call after the interaction that triggers it, with `toHaveBeenCalledWith(...)` when the event carries a value. For a disabled state, assert `not.toHaveBeenCalled()`
- Wrap an assertion in `waitFor` when the outcome appears after an async step, such as an RPC call
- Play functions should demonstrate meaningful interactions (e.g., clicking, typing, keyboard navigation). `userEvent.hover` does not trigger CSS `:hover`, so a play function cannot show a hover style
- Use play functions to show component behavior that requires user interaction to observe

```ts
/** The trigger expands the filters, and the close button emits `close`. */
export const OpenAndClose: Story = {
  args: { onClose: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Filters' })
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(canvas.getByRole('button', { name: 'Close' }))
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}
```

## Accessibility

- Accessibility checking is enabled by default in Storybook
- Ensure components are accessible by:
  - Providing proper ARIA labels in test data
  - Testing with screen readers when possible
  - Following accessibility best practices in component implementation
- Use the accessibility tab in Storybook to verify component accessibility

## Complex Data

- For components requiring complex data structures, use the mock data factories in `src/test/mock-data/`, imported by relative path (e.g., `createMockListingProduct`, `createMockBasketItem`, `createMockPromotion`, `createMockCampaign`, `createMockOrder`). `docs/testing-guidelines.md` section 5 lists the factories by file
- When no factory covers a type, write a typed object literal in the story file instead of an `as unknown as` cast
- Create reusable test data objects at the module level for stories that share similar data
- Use object spread syntax to create variations of base test data
- Take images and videos from `.storybook/assets/`, which `main.ts` serves as a static directory. Reference them by bare file name (`'product-1-big.avif'`), the way the mock-data factories do. A leading `/` breaks the published Storybook, which is served under a sub-path, and remote URLs break offline

## Best Practices

- Keep stories focused - each story should demonstrate one clear use case or state
- Update stories and documentation whenever the component's API or design changes
- Remove outdated stories and add new ones for new features or variants
- Use meaningful, realistic test data that represents actual usage scenarios
- Group related stories together logically
- Add JSDoc comments above story exports to explain what each story demonstrates
- For stories with complex render functions or multiple components, add JSDoc to explain the setup
- Create reusable test data objects at the module level when multiple stories share similar data
- Use the mock-data factories for complex data structures to keep stories maintainable

## Verification

Run these from the application directory before committing a story:

- `pnpm typecheck`: catches wrong args through `satisfies Meta` and `Story`
- `pnpm exec eslint <story file>` and `pnpm exec prettier --check <story file>`
- `pnpm storybook:build`: fails when an import the story reaches has no mock, such as a missing `@inertiajs/vue3` export in `inertia-mock.ts`
