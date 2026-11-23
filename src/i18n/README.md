# Translation (i18n) System

This directory contains the internationalization (i18n) configuration and translation files for the application.

## Overview

The translation system supports three use cases:

1. **Client-side translations** - Translations in Vue components on the client
2. **Server-side rendering (SSR) translations** - Translations during SSR in Vue components
3. **Server-side logic translations** - Translations in mappers, services, and other server-side code

## Structure

- `config.ts` - Shared i18n configuration: `createI18nInstance`, `getPageLocale`, which reads the active
  locale from the page props for both entries, and `resolveLocaleFile`, which picks the locale file for a
  shop locale
- `messagesServer.ts` - Every locale file, bundled. For server code, the SSR entry, Storybook and tests
- `messagesBrowser.ts` - Every locale file as a lazy import. For the browser entry only
- `locales/` - Translation message files (JSON format), one per locale, e.g. `en_GB.json` for `en-GB`

## Which messages load where

Every file in `locales/` is available. A shop's locale picks its file in `resolveLocaleFile`: the file
named after the locale (`de-AT` uses `de_AT.json`), else the file for `fallbackLocale` (`de-DE`). The
fallback logs a warning once per locale, so give every shop locale its own file. The setup CLI creates one
for each shop locale, copied from a file in the same language.

- **Server and SSR**: `messagesServer.ts` bundles every locale file into the server output.
- **Browser**: the client build emits one chunk per locale file, and the entry chunk carries none.
  `main.ts` loads the active locale's chunk with `loadLocaleMessages` and mounts once it has loaded,
  so hydration renders the same text as the server.
- **Preloading**: `ssr.ts` reports the active locale file in `modules` next to the components it
  rendered, and `preloadModules` in `vite.config.ts` keeps it in the SSR manifest. The page then
  carries a `modulepreload` hint for the locale chunk, and the browser fetches it in parallel with
  the entry chunk.

Import `messagesServer.ts` only from server code, the SSR entry, Storybook or tests. Imported from client
code, it puts every locale into the client bundle, so ESLint rejects it in `src/client/` (except `ssr.ts`)
and `src/shared/`.

## Usage

### In Vue Components (Client & SSR)

The i18n instance is automatically set up based on the country locale from Inertia shared props. Use the `useI18n` composable:

```vue
<script setup>
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// Use translations
const message = t('product.addToBasket')
</script>

<template>
  <button>{{ t('product.addToBasket') }}</button>
</template>
```

### In Server-Side Logic (Mappers, Services, etc.)

`ServerI18nService` is registered as the `i18n` slot on the `MapperRegistry`. Take the registry in
the constructor and read `mappers.i18n` — only `src/server/registries.ts` calls
`new ServerI18nService(...)`, so a request builds a single translator that every mapper shares:

```typescript
import type { MapperRegistry, StorefrontContext } from '@scayle/storefront'

export class MyService {
  constructor(
    private readonly storefront: StorefrontContext,
    private readonly mappers: MapperRegistry,
  ) {}

  public doSomething() {
    // Resolved from the registry, never constructed here
    const message = this.mappers.i18n.t('product.addToBasket')
    const localizedMessage = this.mappers.i18n.t('product.price', {
      value: 100,
    })

    return {
      label: message,
      // ... other properties
    }
  }
}
```

## Adding New Translations

1. Add the translation key to `locales/en_GB.json`, where every key is authored
2. Use nested objects for organization (e.g., `product.addToBasket`)
3. Use parameter interpolation for dynamic values: `{ "price": "Price: {value}" }`
4. Run the `translate-locales` skill (`.claude/skills/translate-locales/`) to add the key to every other
   locale file. ESLint fails the build while a locale file is missing a key.
