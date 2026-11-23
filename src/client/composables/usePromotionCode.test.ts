import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'
import { usePromotionCode } from './usePromotionCode'

const mockApplyPromotionCode = vi.fn()
const mockRemovePromotion = vi.fn()
const mockToastShow = vi.fn()
const mockReloadBasket = vi.fn()

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    basket: {
      applyPromotionCode: (...args: unknown[]) =>
        mockApplyPromotionCode(...args),
      removePromotion: (...args: unknown[]) => mockRemovePromotion(...args),
    },
  }),
}))

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: mockToastShow }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@client/composables/useBasket', () => ({
  useBasket: () => ({ reloadBasket: mockReloadBasket }),
}))

describe('usePromotionCode', () => {
  beforeEach(() => {
    mockApplyPromotionCode.mockReset()
    mockRemovePromotion.mockReset()
    mockToastShow.mockReset()
    mockReloadBasket.mockReset()
    mockReloadBasket.mockResolvedValue({})
  })

  describe('enterPromotionCode', () => {
    it('does not call RPC when currentCode is empty', async () => {
      const { currentCode, enterPromotionCode } = usePromotionCode()

      currentCode.value = '   '
      await enterPromotionCode()

      expect(mockApplyPromotionCode).not.toHaveBeenCalled()
    })

    it('on success: clears currentCode, shows success toast, and reloads basket', async () => {
      mockApplyPromotionCode.mockResolvedValue(createSafeSuccess({}))
      const { currentCode, enterPromotionCode } = usePromotionCode()

      currentCode.value = ' SAVE20 '
      await enterPromotionCode()

      expect(mockApplyPromotionCode).toHaveBeenCalledWith({
        promotionCode: 'SAVE20',
      })
      expect(currentCode.value).toBe('')
      expect(mockToastShow).toHaveBeenCalledWith(
        'basket_promotion_codes.add_success',
        { type: 'SUCCESS' },
      )
      expect(mockReloadBasket).toHaveBeenCalled()
    })

    it('on RPC error: shows add_error toast and does not clear input', async () => {
      mockApplyPromotionCode.mockResolvedValue(
        createSafeFailure('Invalid code'),
      )
      const { currentCode, enterPromotionCode } = usePromotionCode()

      currentCode.value = 'BAD'
      await enterPromotionCode()

      expect(mockToastShow).toHaveBeenCalledWith(
        'basket_promotion_codes.add_error',
        { type: 'ERROR' },
      )
      expect(currentCode.value).toBe('BAD')
      expect(mockReloadBasket).not.toHaveBeenCalled()
    })

    it('shows the success toast only after the basket reload resolves', async () => {
      const reload = Promise.withResolvers<Record<string, never>>()
      mockApplyPromotionCode.mockResolvedValue(createSafeSuccess({}))
      mockReloadBasket.mockReturnValue(reload.promise)
      const { currentCode, enterPromotionCode } = usePromotionCode()

      currentCode.value = 'SAVE20'
      const pending = enterPromotionCode()
      await vi.waitFor(() => expect(mockReloadBasket).toHaveBeenCalled())

      expect(mockToastShow).not.toHaveBeenCalled()

      reload.resolve({})
      await pending

      expect(mockToastShow).toHaveBeenCalledWith(
        'basket_promotion_codes.add_success',
        { type: 'SUCCESS' },
      )
    })

    // The global error toast from `main.ts` already reported the failed reload.
    it('shows no toast when the basket reload fails', async () => {
      mockApplyPromotionCode.mockResolvedValue(createSafeSuccess({}))
      mockReloadBasket.mockResolvedValue({ error: new Error('reload failed') })
      const { currentCode, enterPromotionCode } = usePromotionCode()

      currentCode.value = 'SAVE20'
      await enterPromotionCode()

      expect(mockToastShow).not.toHaveBeenCalled()
    })

    it('sends one request for repeated calls while one is pending', async () => {
      const response =
        Promise.withResolvers<ReturnType<typeof createSafeFailure>>()
      mockApplyPromotionCode.mockReturnValue(response.promise)
      const { currentCode, isApplying, enterPromotionCode } = usePromotionCode()

      currentCode.value = 'SAVE20'
      const first = enterPromotionCode()
      await enterPromotionCode()

      expect(isApplying.value).toBe(true)
      expect(mockApplyPromotionCode).toHaveBeenCalledTimes(1)

      response.resolve(createSafeFailure('Invalid code'))
      await first

      expect(isApplying.value).toBe(false)
    })
  })

  describe('removePromotionCode', () => {
    it('on success: reloads basket', async () => {
      mockRemovePromotion.mockResolvedValue(createSafeSuccess({}))
      const { removePromotionCode } = usePromotionCode()

      await removePromotionCode('promo-id-123')

      expect(mockRemovePromotion).toHaveBeenCalledWith({
        promotionId: 'promo-id-123',
      })
      expect(mockReloadBasket).toHaveBeenCalled()
    })

    it('on RPC error: shows remove_error toast and does not reload', async () => {
      mockRemovePromotion.mockResolvedValue(createSafeFailure('Not found'))
      const { removePromotionCode } = usePromotionCode()

      await removePromotionCode('promo-id-123')

      expect(mockToastShow).toHaveBeenCalledWith(
        'basket_promotion_codes.remove_error',
        { type: 'ERROR' },
      )
      expect(mockReloadBasket).not.toHaveBeenCalled()
    })

    it('shows no toast when the basket reload fails', async () => {
      mockRemovePromotion.mockResolvedValue(createSafeSuccess({}))
      mockReloadBasket.mockResolvedValue({ error: new Error('reload failed') })
      const { removePromotionCode } = usePromotionCode()

      await removePromotionCode('promo-id-123')

      expect(mockToastShow).not.toHaveBeenCalled()
    })

    it('sends one request per promotion while its removal is pending', async () => {
      const response =
        Promise.withResolvers<ReturnType<typeof createSafeSuccess>>()
      mockRemovePromotion.mockReturnValue(response.promise)
      const { isRemoving, removePromotionCode } = usePromotionCode()

      const first = removePromotionCode('promo-a')
      await removePromotionCode('promo-a')
      const other = removePromotionCode('promo-b')

      expect(mockRemovePromotion).toHaveBeenCalledTimes(2)
      expect(isRemoving('promo-a')).toBe(true)

      response.resolve(createSafeSuccess({}))
      await Promise.all([first, other])

      expect(isRemoving('promo-a')).toBe(false)
    })
  })
})
