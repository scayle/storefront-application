<template>
  <SFDropdown
    id="gender-selection-dropdown"
    ref="dropdown"
    v-model="activeGenderValue"
    v-model:visible="isGenderSelectionVisible"
    :items="items"
    :disabled="disabled"
    :has-errors="!isValid"
    :aria-label="$t('account.form_fields.gender')"
    :aria-describedby="ariaDescribedby"
    variant="with-label"
    size="lg"
    :label="`${$t('account.form_fields.gender')} *`"
    class="w-full"
    data-testid="gender-selection"
  >
    <template v-if="activeGenderLabel">
      <span class="body-default">
        {{ activeGenderLabel }}
      </span>
    </template>
    <template
      #item="{
        item: gender,
        selectItem: selectGender,
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
        :selected="isSelected"
        :active="isActive"
        size="lg"
        :data-testid="`gender-option-${gender}`"
        @select="selectGender(gender)"
        @mousemove="setActive(index)"
      >
        <span class="text-lg">
          {{ genderMap[gender] }}
        </span>
      </SFDropdownOptionItem>
    </template>
  </SFDropdown>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import SFDropdown from '@client/components/ui/form/SFDropdown.vue'
import SFDropdownOptionItem from '@client/components/ui/form/SFDropdownOptionItem.vue'
import { DropdownOptionType } from '@client/utils/constants'
import type { Customer } from '@scayle/storefront/types'

type Gender = NonNullable<Customer['gender']>

const { ariaDescribedby } = defineProps<{
  /** When true, the dropdown is disabled and cannot be interacted with. */
  disabled: boolean
  /** When true, applies valid styling. When false, shows error state. */
  isValid: boolean
  /** ID of the element that describes this dropdown, for error message association. */
  ariaDescribedby?: string
}>()

const isGenderSelectionVisible = defineModel<boolean>('visible', {
  default: false,
})

const activeGenderValue = defineModel<Gender | undefined>()

const { t } = useI18n()

const genderMap = computed<Record<Gender, string>>(() => ({
  m: t('account.form_fields.gender_options.male'),
  f: t('account.form_fields.gender_options.female'),
  d: t('account.form_fields.gender_options.diverse'),
  n: t('account.form_fields.gender_options.none'),
}))

const items = computed<Gender[]>(() => Object.keys(genderMap.value) as Gender[])

const activeGenderLabel = computed(() => {
  return activeGenderValue.value && genderMap.value[activeGenderValue.value]
})

// `InstanceType<typeof SFDropdown>` doesn't work — SFDropdown is a generic
// component (`<script setup generic="T">`). Type the exposed shape directly.
const dropdown = useTemplateRef<{ focus: () => void }>('dropdown')

defineExpose({
  focus: () => dropdown.value?.focus(),
})
</script>
