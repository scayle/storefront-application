<template>
  <CmsHead />
  <section
    :key="pageKey"
    v-live-preview:content="pageData?.entry"
    class="w-full"
  >
    <ContentstackBlockDispatch
      v-for="(element, index) in contentElements"
      :key="element?.uid ?? index"
      :content-element="element"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue'
import type { CMSPageData, PageComponent } from '@shared/types/cms/contentstack'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import { useContentstackEditor } from '../composables/useContentstackEditor'
import CmsHead from './CmsHead.vue'
import ContentstackBlockDispatch from './ContentstackBlockDispatch.vue'

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

useContentstackEditor(pageData)

// Marks the first image rendered on this page as the LCP-critical, high-priority one.
provideLcpPriority()

/** Extracts top-level content blocks from the Contentstack page entry. */
const contentElements = computed(() => {
  const entry = pageData.value?.entry as PageComponent
  return entry?.content ?? []
})

/** Derives a stable key from the entry's system UID. */
const pageKey = computed(() => {
  return String(pageData.value?.entry?.uid ?? 'contentstack-page')
})
</script>
