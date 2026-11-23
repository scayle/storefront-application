<template>
  <div class="mt-4 flex flex-col gap-5">
    <h3 class="heading-section-2">
      {{ $t('basket_promotion_codes.headline') }}
    </h3>
    <SFTextInput
      v-model="currentCode"
      :placeholder="$t('basket_promotion_codes.input_placeholder')"
      :aria-label="$t('basket_promotion_codes.input_label')"
      @keydown.enter="enterPromotionCode"
    >
      <template #trailing>
        <SFButton
          type="button"
          variant="raw"
          class="size-full rounded-md text-md text-accent! aria-busy:animate-pulse motion-reduce:aria-busy:opacity-50"
          data-testid="promotion-code-add"
          :loading="isApplying"
          :aria-label="$t('basket_promotion_codes.add_code')"
          @click.prevent="enterPromotionCode"
        >
          <IconIncrementPlus class="size-4" />
        </SFButton>
      </template>
    </SFTextInput>
    <div
      class="-mt-2 flex flex-wrap gap-2 font-semibold"
      :class="{ 'pb-2': promotionCodes.length > 0 }"
    >
      <div
        v-for="promotion in promotionCodes"
        :key="promotion.id"
        :style="promotion.color"
        class="flex items-center gap-2 overflow-hidden rounded-md px-3 py-1 text-md/5"
      >
        <span
          :title="promotion.code ?? undefined"
          class="overflow-hidden text-ellipsis"
          >{{ promotion.code }}</span
        >
        <SFButton
          variant="raw"
          :loading="isRemoving(promotion.id)"
          :aria-label="
            $t('basket_promotion_codes.remove_code', { code: promotion.code })
          "
          class="hit-area-min flex shrink-0 aria-busy:animate-pulse motion-reduce:aria-busy:opacity-50"
          @click="removePromotionCode(promotion.id)"
        >
          <template #append-icon>
            <IconNavigationClose
              class="size-3"
              :style="{ fill: promotion.color.color }"
            />
          </template>
        </SFButton>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFTextInput from '@client/components/ui/form/SFTextInput.vue'
import { usePromotionCode } from '@client/composables/usePromotionCode'
import IconIncrementPlus from '@assets/icons/increment/plus.svg'
import IconNavigationClose from '@assets/icons/navigation/close.svg'
import type { Promotion } from '@scayle/storefront/types'

defineProps<{
  /** Promotions already applied to the basket via a code, rendered as removable chips. */
  promotionCodes: Promotion[]
}>()

const {
  currentCode,
  isApplying,
  isRemoving,
  enterPromotionCode,
  removePromotionCode,
} = usePromotionCode()
</script>
