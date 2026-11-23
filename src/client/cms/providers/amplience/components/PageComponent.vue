<template>
  <CmsHead />
  <section
    :key="pageKey"
    :data-amplience-entry-id="pageContent?._meta?.deliveryId"
    data-amplience-field-id="components"
    class="w-full"
  >
    <AmplienceBlockDispatch
      v-for="(element, index) in contentElements"
      :key="getBlockKey(element, index)"
      :content-element="element"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue'
import type { CMSPageData, PageComponent } from '@shared/types/cms/amplience'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import { extractBlocks, getBlockKey } from '../utils/blocks'
import { useAmplienceEditor } from '../composables/useAmplienceEditor'
import AmplienceBlockDispatch from './AmplienceBlockDispatch.vue'
import CmsHead from './CmsHead.vue'

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

useAmplienceEditor(pageData)

// Marks the first image rendered on this page as the LCP-critical, high-priority one.
provideLcpPriority()

const pageContent = computed(() => pageData.value as PageComponent)

const contentElements = computed(() =>
  extractBlocks(pageContent.value?.components),
)

/**
 * Re-keys the section per content item so navigating between two CMS pages
 * replaces the block tree instead of patching one page's blocks into another's.
 */
const pageKey = computed(
  () =>
    pageContent.value?._meta?.deliveryKey ??
    pageContent.value?._meta?.deliveryId ??
    'amplience-page',
)
</script>
