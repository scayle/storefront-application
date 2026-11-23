const WHITESPACE_PATTERN = /\s+/

/**
 * Escapes regex metacharacters so a string matches literally inside a `RegExp`.
 * The search term runs through this before it becomes the highlight pattern, so
 * a query like `(USD)` matches the literal text instead of opening a group.
 *
 * @param str - The raw string to treat as literal regex text
 * @returns The string with every regex metacharacter backslash-escaped
 */
const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Escapes the five HTML-significant characters so a string renders as text under
 * `v-html`. Replace `&` first, otherwise the later replacements would re-escape
 * the `&` in the entities this function just wrote.
 *
 * @param str - The raw text to render inside HTML
 * @returns The string with `&`, `<`, `>`, `"`, and `'` replaced by their entities
 */
const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * Wraps each match of the search term in a bold `<span>` and escapes the rest,
 * returning a string the search suggestions render with `v-html`. The only
 * markup it writes is the fixed wrapper, so it escapes every segment itself and
 * needs no HTML sanitizer, keeping the eager search path off `isomorphic-dompurify`.
 *
 * @param text - The text to highlight within (e.g. a product or category name)
 * @param term - The search query. Space-separated words match individually
 * @returns HTML with matches wrapped in `<span class="font-semibold">`, every
 *   other character escaped. Returns the escaped `text` for an empty term.
 */
export function highlightSearchTerm(text: string, term: string): string {
  const words = term.split(WHITESPACE_PATTERN).filter(Boolean).map(escapeRegExp)
  if (words.length === 0) {
    return escapeHtml(text)
  }

  // Splitting on a capturing group interleaves the matched terms with the text
  // around them: even indices are unmatched text, odd indices are the matches.
  return text
    .split(new RegExp(`(${words.join('|')})`, 'i'))
    .map((segment, index) =>
      index % 2 === 0
        ? escapeHtml(segment)
        : `<span class="font-semibold">${escapeHtml(segment)}</span>`,
    )
    .join('')
}
