<template>
  <SFItemSlider>
    <template #header>
      <SFSkeletonLoader
        type="custom"
        class="mb-6 h-8 max-w-48 rounded-lg bg-gray-300"
      />
    </template>
    <div
      v-for="n in SKELETON_COUNT"
      :key="n"
      class="my-1 w-1/2 shrink-0 snap-start pr-4 lg:w-1/5"
    >
      <SFProductCardSkeleton />
    </div>
  </SFItemSlider>
</template>

<script setup lang="ts">
import SFItemSlider from '@client/components/ui/core/SFItemSlider.vue'
import SFSkeletonLoader from '@client/components/ui/core/SFSkeletonLoader.vue'
import SFProductCardSkeleton from '@client/components/product/card/SFProductCardSkeleton.vue'

const SKELETON_COUNT = 4
</script>
