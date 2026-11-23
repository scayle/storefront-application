<!-- eslint-disable @typescript-eslint/no-explicit-any -- The JSON RTE render callbacks receive untyped nodes and the SDK exports no node types -->
<template>
  <!-- eslint-disable vue/no-v-html -- `html` is the output of `sanitizeCmsHtml` (DOMPurify), see the computed below -->
  <div
    v-live-preview:content="contentElement"
    class="body-default"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
import { computed } from 'vue'
import contentstack from '@contentstack/delivery-sdk'
import {
  isAbsoluteLink,
  isExternalLink,
  localizeLink,
} from '@scayle/storefront/shared'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { useRoute } from '@client/composables/useRoute'
import { sanitizeCmsHtml } from '@client/cms/shared/richtext'
import {
  escapeAttr,
  buildSafeHref,
  normalizeCmsLink,
} from '@client/cms/shared/links'
import type { RichtextComponent } from '@shared/types/cms/contentstack'

const { contentElement } = defineProps<{
  contentElement: RichtextComponent
}>()

const { config, country } = useStorefrontConfig()
const { baseUrl } = useRoute()

// The SDK bundles @contentstack/utils as `Utils` on the default export at runtime.
// TypeScript declarations expose it via a namespace that doesn't resolve with
// the standard ESM default import, so we access it through the runtime shape.
const Utils = (
  contentstack as unknown as {
    Utils: {
      jsonToHTML: (option: {
        entry: unknown
        paths: string[]
        renderOption?: unknown
      }) => void
      Node: unknown
      Next: unknown
    }
  }
).Utils

const isEmptyNode = (node: {
  children?: Array<{ type?: string; text?: string }>
}) =>
  !node.children?.length ||
  node.children.every(
    (child) => !child.type && 'text' in child && child.text === '',
  )

/** Custom render options for Contentstack JSON RTE to HTML conversion. */
const renderOption = {
  h1: (node: any, next: any) => {
    if (isEmptyNode(node)) {
      return '<br class="mb-2" />'
    }
    return `<h1 class="heading-page">${next(node.children)}</h1>`
  },
  h2: (node: any, next: any) => {
    if (isEmptyNode(node)) {
      return '<br class="mb-1" />'
    }
    return `<h2 class="heading-section-1">${next(node.children)}</h2>`
  },
  h3: (node: any, next: any) => {
    if (isEmptyNode(node)) {
      return '<br class="mb-5" />'
    }
    return `<h3 class="heading-section-2">${next(node.children)}</h3>`
  },
  a: (node: any, next: any) => {
    const rawHref = node.attrs?.url ?? node.attrs?.href ?? ''
    const target = node.attrs?.target ?? '_self'
    const inputHref = typeof rawHref === 'string' ? rawHref : ''
    const url =
      isExternalLink(inputHref, baseUrl.value) || isAbsoluteLink(inputHref)
        ? inputHref
        : localizeLink(config.value, normalizeCmsLink(inputHref, country.value))
    const href = buildSafeHref(url)
    return `<a class="font-semibold" href="${href}" target="${escapeAttr(target)}">${next(node.children)}</a>`
  },
  reference: (node: any, next: any) => {
    const href = buildSafeHref(node.attrs?.href ?? '')
    const target = node.attrs?.target ?? '_self'
    return `<a href="${href}" target="${escapeAttr(target)}" class="font-semibold">${next(node.children)}</a>`
  },
  ul: (node: any, next: any) =>
    `<ul class="list-disc pl-6">${next(node.children)}</ul>`,
  ol: (node: any, next: any) =>
    `<ol class="list-decimal pl-6">${next(node.children)}</ol>`,
  li: (node: any, next: any) => `<li>${next(node.children)}</li>`,
  p: (node: any, next: any) => {
    if (isEmptyNode(node)) {
      return '<br />'
    }
    return `<p class="body-default">${next(node.children)}</p>`
  },
}

/**
 * Converts the JSON RTE field to sanitized HTML.
 * `jsonToHTML` mutates the entry in-place, replacing the JSON object at
 * the given path with an HTML string. We clone the entry to avoid
 * mutating the reactive prop.
 */
const html = computed(() => {
  if (!contentElement.content || typeof contentElement.content !== 'object') {
    return ''
  }

  const clone = { ...contentElement, content: contentElement.content }

  Utils.jsonToHTML({
    entry: clone,
    paths: ['content'],
    renderOption,
  })

  const result = clone.content
  return sanitizeCmsHtml(typeof result === 'string' ? result : '')
})
</script>
