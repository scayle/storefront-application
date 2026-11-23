<template>
  <!--
    Skip links: the first focusable elements on the page. Visually hidden until
    a child receives keyboard focus, then the whole bar slides into view
    (focus-within) so all links are visible at once, matching the v2 UI.
    Translated off-screen rather than `display:none` so the links stay in the
    tab order and the accessibility tree.

    Targets: `#main-content` (both layouts), `#header-search` (desktop search
    input), `#header-basket` (desktop basket button). The latter two only exist
    in the full header, so the links are gated by props and hidden below `lg`.
  -->
  <nav
    :aria-label="$t('a11y.skip_links')"
    class="fixed top-0 left-0 z-50 flex w-full -translate-y-full justify-center gap-2 bg-white p-2 shadow-overlay transition-transform duration-150 focus-within:translate-y-0 motion-reduce:transition-none"
  >
    <a
      href="#main-content"
      class="sf-skip-link"
      data-testid="button-skip-to-main"
    >
      {{ $t('common.skip_to_main_content') }}
    </a>
    <a
      v-if="search"
      href="#header-search"
      class="sf-skip-link max-lg:hidden"
      data-testid="button-skip-to-search"
    >
      {{ $t('common.skip_to_search') }}
    </a>
    <a
      v-if="basket"
      href="#header-basket"
      class="sf-skip-link max-lg:hidden"
      data-testid="button-skip-to-basket"
    >
      {{ $t('common.skip_to_basket') }}
    </a>
  </nav>
</template>

<script setup lang="ts">
const { search = false, basket = false } = defineProps<{
  /** Render the "Skip to search" link, targeting the desktop header search. */
  search?: boolean
  /** Render the "Skip to basket" link. Pass `false` on the basket page. */
  basket?: boolean
}>()
</script>
