<template>
  <!-- eslint-disable vue/no-v-html -- `html` is the output of `sanitizeCmsHtml` (DOMPurify), see the computed below -->
  <div
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="content"
    class="body-default"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BLOCKS, INLINES } from '@contentful/rich-text-types'
import type { Block, Inline, Document } from '@contentful/rich-text-types'
import { documentToHtmlString } from '@contentful/rich-text-html-renderer'
import type { Next, Options } from '@contentful/rich-text-html-renderer'
import {
  localizeLink,
  isExternalLink,
  isAbsoluteLink,
} from '@scayle/storefront/shared'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { sanitizeCmsHtml } from '@client/cms/shared/richtext'
import {
  escapeAttr,
  buildSafeHref,
  normalizeCmsLink,
} from '@client/cms/shared/links'
import type { TypeRichTextComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import { useRoute } from '@client/composables/useRoute'

const { contentElement } = defineProps<{
  contentElement: TypeRichTextComponentWithoutUnresolvableLinksResponse
}>()

const { config, country } = useStorefrontConfig()
const { baseUrl } = useRoute()

/** Custom renderers for Contentful rich text nodes. */
const options = {
  renderNode: {
    [BLOCKS.HEADING_1]: (node: Block, next: Next) =>
      `<h1 class="heading-page">${next(node.content)}</h1>`,
    [BLOCKS.HEADING_2]: (node: Block, next: Next) =>
      `<h2 class="heading-section-1">${next(node.content)}</h2>`,
    [BLOCKS.HEADING_3]: (node: Block, next: Next) =>
      `<h3 class="heading-section-2">${next(node.content)}</h3>`,
    [INLINES.HYPERLINK]: (node: Inline, next: Next) => {
      const data = node.data as {
        uri: string
        target?: string
        rel?: string
      }
      const url =
        isExternalLink(data.uri, baseUrl.value) || isAbsoluteLink(data.uri)
          ? data.uri
          : localizeLink(
              config.value,
              normalizeCmsLink(data.uri, country.value),
            )
      const href = buildSafeHref(url)
      const openInNewTab = data.target === '_blank'
      const targetAttr = openInNewTab ? ' target="_blank"' : ''
      let relAttr = ''
      if (openInNewTab && data.rel == null) {
        relAttr = ' rel="noopener noreferrer"'
      } else if (data.rel != null) {
        relAttr = ` rel="${escapeAttr(data.rel)}"`
      }
      return `<a class="font-semibold" href="${href}"${targetAttr}${relAttr}>${next(node.content)}</a>`
    },
    [INLINES.ENTRY_HYPERLINK]: (node: Inline, next: Next) => {
      const slug = node.data.target?.fields?.slug ?? ''
      const href = buildSafeHref(localizeLink(config.value, `/content/${slug}`))
      return `<a class="font-semibold" href="${href}">${next(node.content)}</a>`
    },
    [INLINES.ASSET_HYPERLINK]: (node: Inline, next: Next) => {
      const fileUrl = node.data.target?.fields?.file?.url ?? ''
      const href = buildSafeHref(fileUrl)
      return `<a class="font-semibold" href="${href}">${next(node.content)}</a>`
    },
    [BLOCKS.UL_LIST]: (node: Block, next: Next) =>
      `<ul class="list-disc pl-6">${next(node.content)}</ul>`,
    [BLOCKS.OL_LIST]: (node: Block, next: Next) =>
      `<ol class="list-decimal pl-6">${next(node.content)}</ol>`,
    [BLOCKS.PARAGRAPH]: (node: Block, next: Next) => {
      if (
        node.content.length === 0 ||
        (node.content.length === 1 &&
          node.content[0]?.nodeType === 'text' &&
          node.content[0]?.value === '')
      ) {
        return '<br />'
      }
      return `<p class="body-default">${next(node.content)}</p>`
    },
  },
}

/**
 * Renders Contentful rich text to sanitized HTML.
 * Applies custom renderers for headings, links, and lists, then sanitizes the output.
 */
const html = computed(() => {
  const content = contentElement.fields?.content
  if (!content || typeof content !== 'object') {
    return ''
  }

  const richTextHtml = documentToHtmlString(
    content as Document,
    options as Partial<Options>,
  )
  return sanitizeCmsHtml(richTextHtml)
})
</script>
