<template>
  <SFModal
    v-model:visible="visible"
    :headline="$t('basket_card.remove_from_basket_confirmation')"
    :description="$t('basket_card.remove_from_basket_confirmation_description')"
    @close="emit('cancel')"
  >
    <template #actions>
      <SFButton
        data-testid="basket-remove-item-confirm-button"
        :disabled="isConfirming"
        :loading="isConfirming"
        @click="emit('confirm')"
      >
        {{ t('basket_card.confirm_removal') }}
      </SFButton>
    </template>
  </SFModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SFButton from '../ui/core/SFButton.vue'
import SFModal from '../ui/core/SFModal.vue'

const visible = defineModel<boolean>('visible', { default: false })

const { t } = useI18n()

defineProps<{
  isConfirming?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>
