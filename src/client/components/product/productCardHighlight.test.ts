import { describe, expect, it } from 'vitest'
import {
  isCssColor,
  resolveHighlightColors,
  sanitizeCssColor,
} from './productCardHighlight'

describe('productCardHighlight', () => {
  describe('sanitizeCssColor', () => {
    it('accepts supported HEX and rgb values', () => {
      expect(sanitizeCssColor('#e3000b')).toBe('#e3000b')
      expect(sanitizeCssColor('rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)')
    })

    it('returns undefined for unsupported values', () => {
      expect(sanitizeCssColor('not-a-color')).toBeUndefined()
      expect(sanitizeCssColor('javascript:alert(1)')).toBeUndefined()
    })
  })

  describe('isCssColor', () => {
    it('detects supported CSS color strings', () => {
      expect(isCssColor('#fff')).toBe(true)
      expect(isCssColor('#ffffff')).toBe(true)
      expect(isCssColor('#ffffffff')).toBe(true)
      expect(isCssColor('rgba(0, 0, 0, 0.5)')).toBe(true)
      expect(isCssColor('red')).toBe(false)
    })

    it('rejects rgb channels above 255', () => {
      expect(isCssColor('rgb(256, 0, 0)')).toBe(false)
      expect(isCssColor('rgb(300, 999, 50)')).toBe(false)
    })
  })

  describe('resolveHighlightColors', () => {
    it('defers text color to contrast-color() when only a background is provided', () => {
      expect(resolveHighlightColors('#000000')).toEqual({
        backgroundColor: '#000000',
        color: 'contrast-color(#000000)',
      })
    })

    it('keeps an explicit text color when both colors are valid', () => {
      expect(resolveHighlightColors('#e3000b', '#ffffff')).toEqual({
        backgroundColor: '#e3000b',
        color: '#ffffff',
      })
    })

    it('uses only the explicit text color when the background is invalid', () => {
      expect(resolveHighlightColors('bad', '#ffffff')).toEqual({
        backgroundColor: undefined,
        color: '#ffffff',
      })
    })

    it('returns undefined when both inputs are invalid', () => {
      expect(resolveHighlightColors('bad', 'values')).toBeUndefined()
    })
  })
})
