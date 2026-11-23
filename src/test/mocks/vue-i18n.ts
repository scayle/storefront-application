/**
 * Default `vue-i18n` module mock. Replaces the module in a test file with:
 *
 * ```ts
 * vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))
 * ```
 *
 * The path is a string because the `import('vue-i18n')` form would type-check
 * this `useI18n` against the full `Composer`, which the mock does not build.
 *
 * A component test that renders `$t` in its template passes the same `t` as a
 * global mock: `mount(Component, { global: { mocks: { $t: t } } })`.
 */

/**
 * Echoes the translation key instead of translating it. When the call passes
 * named values or a plural count, the key is followed by that argument as JSON
 * (`basket.items({"count":2})`), so a test can assert both the key and the values
 * a component sent.
 *
 * @param key Translation key.
 * @param values Named values, list values or plural count passed with the key.
 * @returns The key, followed by the JSON of `values` in parentheses when one is passed.
 */
export function t(key: string, values?: unknown): string {
  return values === undefined ? key : `${key}(${JSON.stringify(values)})`
}

/**
 * Returns a composer holding only the echoing {@link t}. A test whose component
 * also reads `locale` or `te` mocks `vue-i18n` with its own factory.
 *
 * @returns An object with `t`.
 */
export function useI18n() {
  return { t }
}
