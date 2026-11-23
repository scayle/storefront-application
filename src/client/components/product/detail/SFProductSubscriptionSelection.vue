<template>
  <div class="flex flex-col gap-4">
    <!-- Interval selection -->
    <div>
      <span class="mt-2 mb-4 block heading-section-2">
        {{ t('subscription.interval') }}:
      </span>
      <SFDropdown
        id="subscription-interval-dropdown"
        v-model="intervalValue"
        :items="intervals"
        :placeholder="t('subscription.interval')"
        :aria-label="t('subscription.interval')"
        size="lg"
        data-testid="subscription-interval-dropdown"
      >
        <template v-if="intervalValue">
          <span class="font-semibold text-primary">
            {{ intervalValue.label }}
          </span>
        </template>
        <template
          #item="{
            item,
            selectItem,
            setActive,
            index,
            isSelected,
            isActive,
            id,
          }"
        >
          <SFDropdownOptionItem
            :id="id"
            :type="DropdownOptionType.LEADING_RADIO"
            size="lg"
            :selected="isSelected"
            :active="isActive"
            @select="selectItem(item)"
            @mousemove="setActive(index)"
          >
            <span class="text-lg text-primary">{{ item.label }}</span>
          </SFDropdownOptionItem>
        </template>
      </SFDropdown>
    </div>

    <!-- Delivery day selection -->
    <div>
      <span class="mt-2 mb-4 block heading-section-2">
        {{ t('subscription.follow_up_delivery') }}:
      </span>
      <SFDropdown
        id="subscription-delivery-day-dropdown"
        v-model="deliveryDayValue"
        :items="preferredDeliveryDays"
        :placeholder="t('subscription.follow_up_delivery')"
        :aria-label="t('subscription.follow_up_delivery')"
        size="lg"
        data-testid="subscription-delivery-day-dropdown"
      >
        <template v-if="deliveryDayValue">
          <span class="font-semibold text-primary">
            {{ deliveryDayValue.label }}
          </span>
        </template>
        <template
          #item="{
            item,
            selectItem,
            setActive,
            index,
            isSelected,
            isActive,
            id,
          }"
        >
          <SFDropdownOptionItem
            :id="id"
            :type="DropdownOptionType.LEADING_RADIO"
            size="lg"
            :selected="isSelected"
            :active="isActive"
            @select="selectItem(item)"
            @mousemove="setActive(index)"
          >
            <span class="text-lg text-primary">{{ item.label }}</span>
          </SFDropdownOptionItem>
        </template>
      </SFDropdown>
    </div>

    <!-- Subscribe button -->
    <SFButton
      variant="accent"
      size="xl"
      class="mt-5 w-full"
      :disabled="disabled"
      :aria-describedby="disabledReason ? disabledReasonId : undefined"
      data-testid="add-item-to-basket-button-subscribe"
      @click="$emit('addItemToBasket')"
    >
      {{
        t('subscription.product.add_to_basket', {
          interval: intervalValue?.label,
        })
      }}
    </SFButton>

    <!-- Visually hidden disabled reason -->
    <span v-if="disabledReason" :id="disabledReasonId" class="sr-only">
      {{ disabledReason }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PreferredDeliveryDate } from '@shared/types/Subscription'
import { DropdownOptionType } from '@client/utils/constants'
import SFDropdown from '@client/components/ui/form/SFDropdown.vue'
import SFDropdownOptionItem from '@client/components/ui/form/SFDropdownOptionItem.vue'
import SFButton from '@client/components/ui/core/SFButton.vue'

const {
  intervals = [],
  preferredDeliveryDays = [],
  disabled = false,
  disabledReason,
} = defineProps<{
  /**
   * Available subscription intervals (label/value tuples).
   */
  intervals?: { label: string; value: string }[]

  /**
   * Available preferred delivery day options.
   */
  preferredDeliveryDays?: PreferredDeliveryDate[]

  /**
   * Whether the subscription selection is disabled.
   */
  disabled?: boolean

  /**
   * Reason why the selection is disabled (e.g. sold-out text).
   * Rendered as a visually-hidden aria-describedby target.
   */
  disabledReason?: string
}>()

const intervalValue = defineModel<{ label: string; value: string } | undefined>(
  'selectedInterval',
)
const deliveryDayValue = defineModel<PreferredDeliveryDate | undefined>(
  'selectedDeliveryDay',
)

defineEmits<{
  addItemToBasket: []
}>()

const { t } = useI18n()

/** The id the disabled button points at via aria-describedby. */
const disabledReasonId = 'subscription-disabled-reason'
</script>
