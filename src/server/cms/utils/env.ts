import { z } from 'zod'

/**
 * Zod schema for a credential that must be set to a non-empty string.
 * Provider env schemas use it for every variable the provider cannot run
 * without. The custom messages replace Zod's default "expected string,
 * received undefined", which does not tell an operator what to fix.
 */
export const requiredEnv = z
  .string({ error: 'is not set' })
  .min(1, { error: 'is empty' })

/**
 * Validates `process.env` against a CMS provider's schema.
 * Called by each provider's `parseCmsEnv()`, at boot from the server entry and
 * again when the CMS service is created.
 *
 * The error lists every invalid variable by name, so an operator fixes them in
 * one pass. It never includes a variable's value, so a malformed secret does
 * not end up in the logs.
 *
 * @param provider Provider name used in the error message, e.g. `Contentful`
 * @param schema Zod object schema describing the provider's variables
 * @returns The parsed values, typed by the schema
 * @throws Error when a variable is missing or fails validation
 *
 * @example
 * ```ts
 * const env = parseEnv('Storyblok', z.object({ STORYBLOK_CMS_ACCESS_TOKEN: requiredEnv }))
 * ```
 */
export function parseEnv<T extends z.ZodObject>(
  provider: string,
  schema: T,
): z.output<T> {
  const result = schema.safeParse(process.env)

  if (!result.success) {
    throw new Error(
      `Invalid ${provider} CMS environment:\n${z.prettifyError(result.error)}`,
    )
  }

  return result.data
}
