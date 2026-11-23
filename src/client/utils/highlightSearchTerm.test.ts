import { describe, it, expect } from 'vitest'
import { highlightSearchTerm } from './highlightSearchTerm'

// The highlight class is a styling choice a shop may change, so the tests mark
// each highlighted segment with brackets instead of matching the wrapper markup.
const HIGHLIGHT = /<span class="[^"]*">(.*?)<\/span>/g
const markHighlights = (html: string) => html.replace(HIGHLIGHT, '[$1]')

describe('highlightSearchTerm', () => {
  it.for(['', '   '])('returns the text unchanged for the term %j', (term) => {
    expect(highlightSearchTerm('Hello', term)).toBe('Hello')
  })

  it.for([
    ['Homepage', 'ome', 'H[ome]page'],
    ['Homepage', 'HOME', '[Home]page'],
    ['Red shoes sale', 'red sale', '[Red] shoes [sale]'],
    ['Price (USD)', '(USD)', 'Price [(USD)]'],
  ] as const)(
    'highlights %j for the term %j as %j',
    ([text, term, expected]) => {
      expect(markHighlights(highlightSearchTerm(text, term))).toBe(expected)
    },
  )

  it('escapes HTML in the highlighted segment', () => {
    const result = highlightSearchTerm(
      'Test <script>alert("xss")</script>',
      '<script>',
    )
    expect(markHighlights(result)).toBe(
      'Test [&lt;script&gt;]alert(&quot;xss&quot;)&lt;/script&gt;',
    )
  })

  it('escapes HTML in the text outside of highlight spans', () => {
    const result = highlightSearchTerm('<b>Red</b> & blue', 'red')
    expect(markHighlights(result)).toBe('&lt;b&gt;[Red]&lt;/b&gt; &amp; blue')
  })
})
