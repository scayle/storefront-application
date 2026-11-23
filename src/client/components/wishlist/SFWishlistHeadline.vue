<template>
  <h1
    :id="headingId"
    class="flex w-full items-baseline gap-1 heading-section-1 lg:max-w-160"
    data-testid="wishlist-title"
  >
    {{ $t('wishlist_page.title') }}
    <!--
      Hide the suffix while empty: the resolved empty state renders SFEmptyWishlist
      instead, but the loading fallback passes count 0, and "(0 items)" should not
      flash next to the title. `|| undefined` maps 0 to the hidden branch.
    -->
    <SFHeadlineItemCount :count="count || undefined" />
  </h1>
</template>

<script setup lang="ts">
import SFHeadlineItemCount from '@client/components/ui/core/SFHeadlineItemCount.vue'

defineProps<{
  /** Number of items in the wishlist, rendered as “(N items)” next to the title. */
  count: number
  /** Id set on the `<h1>` so the items `<ul>` can reference it via `aria-labelledby`. */
  headingId: string
}>()
</script>
