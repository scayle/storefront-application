<template>
  <SFAccordionGroup class="border-y border-gray-300">
    <SFAccordion
      v-for="section in product.details"
      :id="section.key"
      :key="section.key"
      force-one-column
      :size="Size.MD"
    >
      <template #title>
        <h2 class="heading-section-2">
          {{ section.label }}
        </h2>
      </template>
      <div class="flex flex-col gap-3">
        <p v-if="section.intro" class="text-pretty">
          {{ section.intro }}
        </p>
        <ul class="flex list-disc flex-col gap-1 ps-4">
          <li v-for="line in section.content" :key="line">
            {{ line }}
          </li>
        </ul>
      </div>
    </SFAccordion>
    <SFAccordion id="product-details-shipping" force-one-column :size="Size.MD">
      <template #title>
        <h2 class="heading-section-2">
          {{ $t('product_details.shipping_return_heading.title') }}
        </h2>
      </template>
      <div class="flex flex-col gap-4 text-pretty">
        <p>
          {{ $t('product_details.shipping_return_heading.general_info') }}
        </p>
        <div class="flex flex-col gap-1">
          <h3 class="heading-section-3">
            {{ $t('product_details.shipping_return_heading.dhl_headline') }}
          </h3>
          <p>
            {{ $t('product_details.shipping_return_heading.dhl_paragraph') }}
          </p>
        </div>
        <div class="flex flex-col gap-1">
          <h3 class="heading-section-3">
            {{ $t('product_details.shipping_return_heading.hermes_headline') }}
          </h3>
          <p>
            {{ $t('product_details.shipping_return_heading.hermes_paragraph') }}
          </p>
        </div>
        <p>
          {{ $t('product_details.shipping_return_heading.return_information') }}
        </p>
      </div>
    </SFAccordion>
  </SFAccordionGroup>
</template>

<script setup lang="ts">
import type { DetailedProduct } from '@scayle/storefront/types'
import SFAccordion from '@client/components/ui/accordion/SFAccordion.vue'
import SFAccordionGroup from '@client/components/ui/accordion/SFAccordionGroup.vue'
import { Size } from '@client/utils/constants'

defineProps<{ product: DetailedProduct }>()
</script>
