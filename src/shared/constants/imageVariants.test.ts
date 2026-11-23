import { describe, expect, it } from 'vitest'
import { IMAGE_VARIANTS } from './imageVariants'

const presets = Object.entries(IMAGE_VARIANTS)
const FULL_BLEED_FALLBACK = /, 100vw$/

describe('imageVariants constants', () => {
  // Below 640px the mobile slider renders every gallery image full-bleed with
  // its grid tile preset, so each tile preset has to fall back to `100vw`.
  it.each(['galleryFull', 'galleryHalf', 'galleryThird'] as const)(
    'sizes %s full-bleed below the grid breakpoint',
    (name) => {
      expect(IMAGE_VARIANTS[name].sizes).toMatch(FULL_BLEED_FALLBACK)
    },
  )

  // `buildImageSrcset` emits the widths in array order as the `srcset`
  // candidates. Out-of-order entries still parse, but the descriptor list stops
  // matching the reading order a reviewer expects.
  it.each(presets)('lists %s widths in ascending order', (_, preset) => {
    expect(preset.widths.toSorted((a, b) => a - b)).toEqual([...preset.widths])
  })

  // The fallback fills `src` for a browser that ignores `srcset`, so it has to
  // name a width the CDN is actually asked for.
  it.each(presets)('picks the %s fallback from its own widths', (_, preset) => {
    expect(preset.widths).toContain(preset.fallbackWidth)
  })
})
