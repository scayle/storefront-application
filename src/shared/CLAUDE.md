# CLAUDE.md: Shared

`src/shared/` is the contract between server and client. Only types, route definitions and small
isomorphic helpers cross it. It imports from neither `@server/*` nor `@client/*`.

## Type design

- Shared types describe domain entities (`Promotion`, `BuyXGetYPromotion`), not the props of one page.
  No `PDPPromotions` or `BasketPromotions` that only group two fields for one consumer. Pages compose
  their props from the entity types at the call site.
- A field is not landed until the mapper that produces it assigns it in the same change. A field that
  no mapped-output consumer reads is dead: remove the field, its mapper assignment and the Storefront
  API `with:` entry that fed it together.
- A field is required (`field: T`) when the mapper always assigns it, and optional (`field?: T`) only
  when the mapper cannot. When you tighten a field, audit its consumers in the same change and remove
  the guards that became dead.
- No duplicated values in one interface. When two fields carry the same information, keep one.
- No wrapper object whose only property carries the value (`price.tax.rate`, not `price.tax.vat.rate`).
- Money is integer minor units.
- Use an ordered array of objects where order matters (attribute groups, accordion items). A keyed
  record leaks its iteration order.
- Identifiers that appear in more than one place (Storefront API attribute keys, custom data keys,
  tracking ids, header names) live in a constants module, not in string literals.
- Entities are flat. A type does not carry `parent`, `children` or `rootline` references that make
  every consumer walk a tree to answer a lookup. Compute the consumed shape in the mapper instead
  (`Category.breadcrumbs` is an ordered flat array). The exception is a tree the client renders as a
  tree, such as `NavigationItem.children`.
- Remove a helper in the same change that removes its last caller, together with its tests and types.

## One import path per type

Import SDK domain types from `@scayle/storefront/types`, never from a `src/shared/types/*` module
that re-exports them. `src/shared/types/<Domain>.ts` holds the types this application owns for that
domain and the `declare module '@scayle/storefront/types'` block that adds this shop's fields, so
"what does this shop add to `Promotion`?" has one file to open. A domain with neither an
application-owned type nor an augmentation has no module.

An augmentation needs care:

- Import every augmentation module for its side effects in `src/shared/types/global.d.ts`. Several
  export nothing of their own, and that import list keeps their `declare module` blocks in the program.
- A file with an augmentation has a top-level `import` or `export`. Without one the file is a script,
  and `declare module 'x'` replaces the real module instead of merging into it.
- Prefer `.ts` over `.d.ts` for the file. `skipLibCheck` is on, so TypeScript does not check the body
  of a `.d.ts` file, and a type it cannot resolve there silently becomes `any`.

## Custom data types

Fields that shops configure in the SCAYLE Panel (shop country, promotion and navigation item custom
data) are declared in `src/shared/types/customData.ts` by augmenting `@scayle/storefront-api`. Update
it when the Panel fields change, so mappers and services stay typed without casts.
