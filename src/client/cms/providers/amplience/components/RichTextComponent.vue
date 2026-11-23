<template>
  <!-- eslint-disable vue/no-v-html -- `html` is sanitized with DOMPurify before it reaches the DOM, and rich text cannot mount Vue components. -->
  <div
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="content"
    class="max-w-none body-default"
    v-html="html"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Marked } from 'marked'
import {
  isAbsoluteLink,
  isExternalLink,
  localizeLink,
} from '@scayle/storefront/shared'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { useRoute } from '@client/composables/useRoute'
import { sanitizeCmsHtml } from '@client/cms/shared/richtext'
import { buildSafeHref, normalizeCmsLink } from '@client/cms/shared/links'
import type { RichTextComponent as RichTextComponentType } from '@shared/types/cms/amplience'

const { contentElement } = defineProps<{
  contentElement: RichTextComponentType
}>()

const { config, country } = useStorefrontConfig()
const { baseUrl } = useRoute()

/**
 * Escapes a link title interpolated into the anchor's `title` attribute below.
 *
 * Overriding `marked`'s `link` renderer replaces its own escaping, and markdown
 * allows a double quote inside a link title, so without this an author could
 * close the attribute and inject markup into the anchor tag. DOMPurify strips
 * the executable part afterwards, but the tag should not be malformed before
 * it gets there. The href uses the shared `buildSafeHref` instead, matching
 * every other CMS provider's rich text link rendering.
 */
const escapeAttribute = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/**
 * Renders the native Amplience markdown field to HTML with the storefront's type
 * hierarchy applied.
 *
 * A fresh `Marked` instance per render keeps the renderer overrides scoped to
 * this component: the shared `marked` singleton would leak them into any other
 * caller. The output is sanitized before it reaches `v-html`, which is what makes
 * rendering author-controlled markup safe.
 *
 * Amplience's editor emits raw `<u>` tags for underline (markdown has no syntax
 * for it). Those pass through `marked` as inline HTML and survive sanitization,
 * so no custom tokenizer is needed.
 */
const html = computed(() => {
  const markdown = contentElement.content

  if (!markdown) {
    return ''
  }

  const marked = new Marked({ gfm: true, breaks: true })

  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens)
        const headingClass =
          {
            1: 'heading-page',
            2: 'heading-section-1',
            3: 'heading-section-2',
          }[depth] ?? 'heading-section-3'

        return `<h${depth} class="${headingClass}">${text}</h${depth}>`
      },
      paragraph({ tokens }) {
        return `<p class="body-default">${this.parser.parseInline(tokens)}</p>`
      },
      list(token) {
        const tag = token.ordered ? 'ol' : 'ul'
        const listClass = token.ordered ? 'list-decimal pl-6' : 'list-disc pl-6'
        const body = token.items.map((item) => this.listitem(item)).join('')

        return `<${tag} class="${listClass}">${body}</${tag}>`
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens)
        const url =
          isExternalLink(href, baseUrl.value) || isAbsoluteLink(href)
            ? href
            : localizeLink(config.value, normalizeCmsLink(href, country.value))
        const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : ''
        const targetAttribute = isAbsoluteLink(href)
          ? ' target="_blank" rel="noopener noreferrer"'
          : ''

        return `<a class="font-semibold" href="${buildSafeHref(url)}"${titleAttribute}${targetAttribute}>${text}</a>`
      },
    },
  })

  return sanitizeCmsHtml(marked.parse(markdown, { async: false }))
})
</script>
