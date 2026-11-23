<template>
  <CmsHead />
  <section
    :key="pageKey"
    :data-contentful-entry-id="pageData?.entry?.sys?.id"
    data-contentful-field-id="content"
    class="w-full"
  >
    <ContentfulBlockDispatch
      v-for="(element, index) in contentElements"
      :key="element?.sys?.id ?? index"
      :content-element="element"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue'
import type { Ref } from 'vue'
import type {
  CMSPageData,
  TypePageComponentWithoutUnresolvableLinksResponse,
} from '@shared/types/cms/contentful'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import { useContentfulEditor } from '../composables/useContentfulEditor'
import CmsHead from './CmsHead.vue'
import ContentfulBlockDispatch from './ContentfulBlockDispatch.vue'

/**
 * Multi-root template (`CmsHead` plus the content `section`), so fallthrough
 * attributes are consumed via `useAttrs` and deliberately not rendered.
 */
defineOptions({ inheritAttrs: false })
useAttrs()

const { data } = defineProps<{
  data: CMSPageData
}>()

const pageData = ref(data)

watch(
  () => data,
  (nextValue) => {
    pageData.value = nextValue
  },
)

/**
 * Asserted rather than passed directly: relating `Ref<CMSPageData>` to the
 * composable's `Ref<CMSPageData | undefined>` makes the compiler unfold
 * `ContentfulEntry`, whose `WITHOUT_UNRESOLVABLE_LINKS` generics recurse
 * through every generated content type. That check alone exhausts the
 * instantiation budget (TS2589) as soon as a second module imports this
 * component. The assertion widens the value in the same direction the check
 * would have allowed, so nothing is lost but the cost.
 */
useContentfulEditor(pageData as Ref<CMSPageData | undefined>)

// Marks the first image rendered on this page as the LCP-critical, high-priority one.
provideLcpPriority()

/** Extracts top-level content blocks from the Contentful page entry. */
const contentElements = computed(() => {
  const entry = pageData.value
    ?.entry as TypePageComponentWithoutUnresolvableLinksResponse
  return entry?.fields?.content ?? []
})

/** Derives a stable key from the entry's system ID. */
const pageKey = computed(() => {
  return String(pageData.value?.entry?.sys?.id ?? 'contentful-page')
})
</script>
