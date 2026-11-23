import process from 'node:process'

/**
 * Reads the shop country ID that `E2E_SHOP_ID` forces for the run.
 *
 * @returns The ID, or `undefined` when the variable is unset or empty, so the ID comes from the page.
 * @throws When the variable is set to something that is not a number.
 */
export function getShopIdOverride(): number | undefined {
  const envShopId = process.env.E2E_SHOP_ID
  if (envShopId === undefined || envShopId === '') {
    return undefined
  }
  const parsed = parseInt(envShopId, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`E2E_SHOP_ID must be a number, got: ${envShopId}`)
  }
  return parsed
}
