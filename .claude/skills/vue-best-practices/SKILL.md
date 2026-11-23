---
name: vue-best-practices
description: Vue 3 conventions for Storefront Application V3 — Composition API, script setup, TypeScript.
license: MIT
metadata:
  author: SCAYLE Storefront Core
  version: '1.0.0'
---

# Vue Best Practices for Storefront Application V3

**Full documentation**: [vuejs.org/llms.txt](https://vuejs.org/llms.txt).

## Baseline

- **Composition API only.** Never use the Options API (`data()`, `methods`, `computed: {}` as an object) — every component and composable is written with `setup()`-style code.
- **`<script setup lang="ts">` is mandatory** for every component. No `<script>` + `export default { setup() {...} }` form.
- **TypeScript everywhere.** Props, emits, and composable return types are explicitly typed — no implicit `any` from an untyped `defineProps()`/`defineEmits()`.
- **`ref()` over `reactive()`** for most state. Reserve `reactive()` for complex objects that genuinely need deep reactivity at the object root.

For everything else — naming, props/emits patterns, i18n, navigation, design system, testing — see **`src/client/CLAUDE.md`**, which is the source of truth for this project's component conventions.
