import { reactive, ref } from 'vue'
import type { Ref } from 'vue'
import { useToast } from '@client/composables/useToast'
import { useI18n } from 'vue-i18n'
import { useRpcClient } from '@client/composables/useRpcClient'
import { useBasket } from '@client/composables/useBasket'

interface UsePromotionCodeReturn {
  /**
   * The current promotion code input value.
   */
  currentCode: Ref<string>
  /**
   * Whether a promotion code is currently being added.
   */
  isApplying: Readonly<Ref<boolean>>
  /**
   * Returns whether the given promotion is currently being removed.
   *
   * @param promotionId - The ID of the promotion to check.
   * @returns `true` while the removal request or the basket reload is running.
   */
  isRemoving: (promotionId: string) => boolean
  /**
   * Adds the current promotion code to the basket via RPC.
   * Clears the input and reloads the basket on success, then shows the toast.
   * A failed basket reload shows the global error toast instead. A call while
   * another one is pending does nothing.
   */
  enterPromotionCode: () => Promise<void>
  /**
   * Removes a promotion from the basket via RPC and reloads the basket.
   * A call for a promotion that is already being removed does nothing.
   */
  removePromotionCode: (promotionId: string) => Promise<void>
}

/**
 * Composable for basket promotion codes: input state and actions to add or
 * remove a promotion code via RPC with toast and Inertia reload.
 *
 * Applied codes are not exposed here; consumers read them from the basket
 * (typically `Basket.promotionCodes`) and pass them into the component.
 *
 * @returns currentCode ref, pending state (`isApplying`, `isRemoving`), and the enterPromotionCode and removePromotionCode actions
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/pricing-and-discounts/promotion-codes
 */
export function usePromotionCode(): UsePromotionCodeReturn {
  const currentCode = ref('')
  const toast = useToast()
  const { t } = useI18n()
  const rpcClient = useRpcClient()
  const { reloadBasket } = useBasket()

  // A held Enter key and a double click both call the actions again before the
  // first request settles, so a call while one is pending returns early.
  const isApplying = ref(false)
  const removingPromotionIds = reactive(new Set<string>())

  const isRemoving = (promotionId: string) =>
    removingPromotionIds.has(promotionId)

  const enterPromotionCode = async () => {
    const code = currentCode.value.trim()
    if (!code || isApplying.value) {
      return
    }

    isApplying.value = true
    try {
      const result = await rpcClient.basket.applyPromotionCode({
        promotionCode: code,
      })

      if (result.error) {
        // Keep the promotion code so the user can fix a typo and retry without re-entering.
        toast.show(t('basket_promotion_codes.add_error'), { type: 'ERROR' })
        return
      }

      currentCode.value = ''
      const { error: reloadError } = await reloadBasket()
      // The global error toast already reported a failed reload, and the code
      // may well be applied, so `add_error` would not be true either.
      if (!reloadError) {
        toast.show(t('basket_promotion_codes.add_success'), {
          type: 'SUCCESS',
        })
      }
    } finally {
      isApplying.value = false
    }
  }

  const removePromotionCode = async (promotionId: string) => {
    if (removingPromotionIds.has(promotionId)) {
      return
    }

    removingPromotionIds.add(promotionId)
    try {
      const result = await rpcClient.basket.removePromotion({ promotionId })

      if (result.error) {
        toast.show(t('basket_promotion_codes.remove_error'), { type: 'ERROR' })
        return
      }

      await reloadBasket()
    } finally {
      removingPromotionIds.delete(promotionId)
    }
  }

  return {
    currentCode,
    isApplying,
    isRemoving,
    enterPromotionCode,
    removePromotionCode,
  }
}
