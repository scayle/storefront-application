import { describe, expect, it } from 'vitest'
import { sanitizeCmsHtml } from './richtext'

describe('sanitizeCmsHtml', () => {
  it('removes script tags', () => {
    expect(sanitizeCmsHtml('<p>Copy</p><script>alert(1)</script>')).toBe(
      '<p>Copy</p>',
    )
  })

  it('keeps the formatting tags rich text relies on', () => {
    const html =
      '<h2>Title</h2><p><strong>bold</strong> <em>italic</em> <u>underline</u></p><ul><li>item</li></ul>'

    expect(sanitizeCmsHtml(html)).toBe(html)
  })
})
