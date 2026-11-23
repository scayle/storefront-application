<template>
  <!-- eslint-disable-next-line vue/no-v-html -- `html` is the output of `sanitizeCmsHtml` (DOMPurify), see the computed below -->
  <div v-editable="contentElement" class="body-default" v-html="html" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderRichText } from '@storyblok/js'
import type { SbRichTextRendererMap } from '@storyblok/js'
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
import type { RichTextComponent as RichTextComponentType } from '@shared/types/cms/storyblok'
import { useRoute } from '@client/composables/useRoute'

const { contentElement } = defineProps<{
  contentElement: RichTextComponentType
}>()

const { config, country } = useStorefrontConfig()
const { baseUrl } = useRoute()

/** Typography classes for Storyblok heading levels 1 to 3. */
const HEADING_CLASSES: Record<number, string> = {
  1: 'heading-page',
  2: 'heading-section-1',
  3: 'heading-section-2',
}

/**
 * Localizes an internal Storyblok rich text href for the active storefront country.
 * External, absolute, and hash links are returned unchanged.
 *
 * @param href Raw href from the Storyblok link mark
 * @returns Localized href when internal, otherwise the original href
 */
const localizeRichTextHref = (href: string): string => {
  if (
    !href ||
    isExternalLink(href, baseUrl.value) ||
    isAbsoluteLink(href) ||
    href.startsWith('#')
  ) {
    return href
  }

  const normalizedPath = normalizeCmsLink(href, country.value)
  return localizeLink(config.value, normalizedPath)
}

/**
 * Checks whether a paragraph node should render as a line break for parity with
 * the Contentful RichTextComponent.
 *
 * @param content Paragraph child nodes from Storyblok rich text
 * @returns True when the paragraph is empty or contains only blank text
 */
const isEmptyParagraph = (
  content: Array<{ type?: string; text?: string }> | undefined,
): boolean => {
  if (!content || content.length === 0) {
    return true
  }

  return (
    content.length === 1 &&
    content[0]?.type === 'text' &&
    content[0]?.text === ''
  )
}

/** Custom renderers for Storyblok rich text nodes and marks. */
const renderers: SbRichTextRendererMap = {
  heading: ({ attrs, children }) => {
    const level = attrs?.level ?? 1
    const tag = `h${Math.min(Math.max(level, 1), 6)}`
    const className = HEADING_CLASSES[level]
    const classAttr = className ? ` class="${className}"` : ''
    return `<${tag}${classAttr}>${children}</${tag}>`
  },
  bullet_list: (props) => {
    // Storyblok sends `attrs.class` on bullet lists, but @storyblok/richtext's
    // generated types no longer declare `attrs` for this node.
    const existingClass = (props as { attrs?: { class?: string } }).attrs?.class
    const className = [existingClass, 'list-disc', 'pl-6']
      .filter(Boolean)
      .join(' ')
    return `<ul class="${className}">${props.children}</ul>`
  },
  ordered_list: ({ attrs, children }) => {
    const existingClass = (attrs as { class?: string } | undefined)?.class
    const className = [existingClass, 'list-decimal', 'pl-6']
      .filter(Boolean)
      .join(' ')
    return `<ol class="${className}">${children}</ol>`
  },
  paragraph: ({ content, children }) => {
    if (content === undefined || isEmptyParagraph(content)) {
      return '<br>'
    }
    return `<p class="body-default">${children}</p>`
  },
  link: ({ attrs, children }) => {
    const safeHref = buildSafeHref(localizeRichTextHref(attrs?.href ?? ''))
    const target = attrs?.target
    const openInNewTab = target === '_blank'
    const targetAttr = openInNewTab ? ' target="_blank"' : ''
    // Storyblok sends `rel` on link marks, but @storyblok/richtext's generated
    // types no longer declare it.
    const rel = (attrs as { rel?: string } | undefined)?.rel
    let relAttr = ''
    if (openInNewTab && rel == null) {
      relAttr = ' rel="noopener noreferrer"'
    } else if (rel != null) {
      relAttr = ` rel="${escapeAttr(rel)}"`
    }
    return `<a class="font-semibold" href="${safeHref}"${targetAttr}${relAttr}>${children}</a>`
  },
}

type RichTextInput = Parameters<typeof renderRichText>[0]
/**
 * Renders Storyblok rich text to HTML, localizes internal links, and sanitizes output.
 * The sanitized HTML is rendered with `v-html` in the template.
 */
const html = computed(() => {
  if (!contentElement.content || typeof contentElement.content !== 'object') {
    return ''
  }

  const richTextHtml = renderRichText(contentElement.content as RichTextInput, {
    renderers,
  })
  return sanitizeCmsHtml(richTextHtml)
})
</script>
