import type { ProductVariant } from '@scayle/storefront/types'
import { clamp } from './math'

export const getMaxQuantity = (variant?: ProductVariant) =>
  clamp(variant?.stock ?? 1, 0, 10)
