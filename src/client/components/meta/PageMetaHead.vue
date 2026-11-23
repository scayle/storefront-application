<template>
  <!--
    The title is a prop, not a `<title>` child: Inertia escapes the prop on
    the server but writes text children into the HTML as they are, so a
    search term or product name containing markup would run as script.
    Inertia also drops the prop as soon as any `<title>` child exists, so
    none may be added under this `<Head>`.
  -->
  <Head :title="meta.title">
    <meta
      v-if="meta.description"
      name="description"
      :content="meta.description"
    />
    <link
      v-if="meta.canonicalLink"
      :rel="meta.canonicalLink.rel"
      :href="meta.canonicalLink.href"
    />
    <meta v-if="meta.robots" name="robots" :content="meta.robots" />
    <template v-if="hreflangs?.length">
      <link
        v-for="hreflang in hreflangs"
        :key="hreflang.hreflang"
        :rel="hreflang.rel"
        :href="hreflang.href"
        :hreflang="hreflang.hreflang"
      />
    </template>
    <component
      :is="'script'"
      v-if="stringifiedJsonLd"
      type="application/ld+json"
    >
      <!-- eslint-disable-next-line vue/no-restricted-syntax -- script bodies are raw text, `stringifiedJsonLd` escapes them -->
      {{ stringifiedJsonLd }}
    </component>
    <meta property="og:type" content="website" />
    <meta property="og:title" :content="meta.title" />
    <meta
      v-if="meta.description"
      property="og:description"
      :content="meta.description"
    />
    <meta v-if="meta.image" property="og:image" :content="meta.image" />
    <meta
      v-if="meta.canonicalLink"
      property="og:url"
      :content="meta.canonicalLink.href"
    />
  </Head>
</template>

<script setup lang="ts">
import type { Hreflang } from '@scayle/storefront/types'
import type { PageJsonLd, SEOMeta } from '@shared/types/SEO'
import { Head } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, watch } from 'vue'
import { usePageMeta } from '@client/composables/usePageMeta'
import { usePage } from '@client/composables/usePage'

const props = defineProps<{
  meta: SEOMeta
  hreflangs?: Hreflang[]
  /** Structured data of the page. Pages send it as a server-only prop. */
  jsonLd?: PageJsonLd
}>()

// Mirror the current page's title into the shared `usePageMeta` state so
// consumers (the route announcer in particular) can react to title changes
// via Vue's reactivity without observing the DOM. `immediate: true` covers
// the case where this component mounts with a title already set, e.g. on
// the initial render.
const { setCurrentTitle } = usePageMeta()
watch(
  () => props.meta.title,
  (next) => {
    setCurrentTitle(next)
  },
  { immediate: true },
)

// The reset `usePageMeta` relies on. `onBeforeUnmount` runs before the next
// page's `setup()`; `onUnmounted` runs after it and would clear the title that
// page just set.
onBeforeUnmount(() => {
  setCurrentTitle('')
})

// `jsonLd` is a server-only prop, so only the server-rendered page carries it.
// A partial reload keeps every prop its response leaves out, so after PLP
// pagination the page would still hold the JSON-LD of the page it started on.
// The JSON-LD describes the URL the server built it for, so it renders only
// while the page is still on that URL.
const page = usePage()
const jsonLdUrl = page.url

// Vue interpolation {{ jsonLd }} would render objects as [object Object].
// application/ld+json script bodies must be valid JSON for crawlers.
//
// `JSON.stringify` does not escape `<`, so merchant-editable fields (e.g. product name)
// containing a script-end token, an HTML comment opener, or a CDATA opener could break out
// of the surrounding <script> tag and enable stored XSS. Escape every `<` to its unicode
// form — valid JSON, zero HTML significance, standard defense used by Next.js / Nuxt.
const stringifiedJsonLd = computed(() => {
  if (!props.jsonLd || page.url !== jsonLdUrl) {
    return undefined
  }
  return JSON.stringify(props.jsonLd).replace(/</g, '\\u003C')
})
</script>
