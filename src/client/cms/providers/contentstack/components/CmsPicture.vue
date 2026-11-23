<template>
  <picture>
    <source
      v-for="source in desktopSources"
      :key="`desktop-${source.type}`"
      :type="source.type"
      :sizes="source.sizes"
      :srcset="source.srcset"
      media="(min-width: 64rem)"
    />
    <source
      v-for="source in mobileSources"
      :key="`mobile-${source.type}`"
      :type="source.type"
      :sizes="source.sizes"
      :srcset="source.srcset"
      media="(width < 64rem)"
    />
    <slot />
  </picture>
</template>

<script setup lang="ts">
import type { CMSImageSource } from '@client/cms/shared/image'

/**
 * Renders the desktop and mobile `<source>` candidates shared by every CMS
 * image block, with the `<img>` fallback supplied through the default slot.
 *
 * `<picture>` is the component root, so `class`, `style`, and any other
 * fallthrough attribute passed to `CmsPicture` land on it directly. Each
 * caller keeps its own `<img>` (loading priority, error handling, alt text),
 * since those differ per block.
 */
defineProps<{
  /** Source candidates for viewports at least 64rem (1024px) wide. */
  desktopSources: CMSImageSource[]
  /** Source candidates for viewports narrower than 64rem (1024px). */
  mobileSources: CMSImageSource[]
}>()
</script>
