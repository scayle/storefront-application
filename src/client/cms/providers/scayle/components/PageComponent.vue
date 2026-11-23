<template>
  <CmsHead />
  <section class="-mb-16 overflow-hidden">
    <div class="mx-auto flex w-full flex-col lg:flex-row">
      <div class="shrink-0 py-4 text-secondary lg:w-1/2 lg:py-10 lg:pr-12">
        <p class="mb-4 font-semibold">Progressive Technology</p>
        <h1 class="mb-8 heading-page">SCAYLE Storefront</h1>
        <p class="mb-10 max-w-192 text-lg/8">
          The SCAYLE Storefront is an all-in-one starter kit for building
          high-performance e-commerce shops for the SCAYLE Commerce Engine. It
          makes it quick and easy to build a best-in-class shop frontend. The
          latest version of Storefront is based on Hono, Inertia.js and Vue 3.
        </p>
        <div class="flex flex-wrap gap-4 text-xl">
          <SFButton
            to="https://scayle.dev/en/storefront"
            target="_blank"
            class="px-6"
          >
            SCAYLE Resource Center
          </SFButton>
          <SFButton
            to="https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms"
            target="_blank"
            variant="secondary"
            class="px-6"
          >
            Setup a CMS for Storefront
          </SFButton>
        </div>
      </div>
      <div class="self-end">
        <!-- WebP fallback for Safari, which intermittently fails the first AVIF decode after SSR. -->
        <picture>
          <source :srcset="heroImageAvif" type="image/avif" />
          <img
            class="lg:-ml-12 lg:w-348 lg:max-w-none"
            :src="heroImageWebp"
            :alt="$t('cms_page.hero_image_alt')"
            width="2784"
            height="1520"
            decoding="async"
            fetchpriority="high"
          />
        </picture>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'
import type { CMSPageData } from '@shared/types/cms/scayle'
import heroImageAvif from '@assets/images/hero.avif'
import heroImageWebp from '@assets/images/hero.webp'
import SFButton from '@client/components/ui/core/SFButton.vue'
import CmsHead from './CmsHead.vue'

/**
 * Multi-root template (`CmsHead` plus the hero `section`), so fallthrough
 * attributes are consumed via `useAttrs` and deliberately not rendered.
 */
defineOptions({ inheritAttrs: false })
useAttrs()

const _props = defineProps<{
  data: CMSPageData
}>()
</script>
