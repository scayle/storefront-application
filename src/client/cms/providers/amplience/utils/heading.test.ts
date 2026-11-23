import { describe, expect, it } from 'vitest'
import { HeadingLevel, HeadlineTag } from '@client/utils/constants'
import {
  HEADING_CLASS_BY_LEVEL,
  resolveHeadingLevel,
  resolveHeadingTag,
} from './heading'

describe('resolveHeadingTag', () => {
  it.for([
    ['h1', HeadlineTag.H1],
    ['h2', HeadlineTag.H2],
    ['h3', HeadlineTag.H3],
    ['h4', HeadlineTag.H4],
  ])('resolves %s to itself', ([textType, expected]) => {
    expect(resolveHeadingTag(textType)).toBe(expected)
  })

  it.for([
    ['missing', undefined],
    ['unrecognized', 'span'],
    ['a heading tag with no mapped level', 'h5'],
  ])(
    'defaults to a paragraph tag for a textType that is %s',
    ([, textType]) => {
      expect(resolveHeadingTag(textType)).toBe(HeadlineTag.P)
    },
  )
})

describe('resolveHeadingLevel', () => {
  it.for([
    [HeadlineTag.H1, HeadingLevel.PAGE],
    [HeadlineTag.H2, HeadingLevel.SECTION_1],
    [HeadlineTag.H3, HeadingLevel.SECTION_2],
    [HeadlineTag.H4, HeadingLevel.SECTION_3],
  ] satisfies Array<[HeadlineTag, HeadingLevel]>)(
    'resolves %s to %s',
    ([tag, expected]) => {
      expect(resolveHeadingLevel(tag)).toBe(expected)
    },
  )

  it('returns undefined for a paragraph tag', () => {
    expect(resolveHeadingLevel(HeadlineTag.P)).toBeUndefined()
  })
})

describe('HEADING_CLASS_BY_LEVEL', () => {
  it('maps every heading level to its typography class', () => {
    expect(HEADING_CLASS_BY_LEVEL).toEqual({
      [HeadingLevel.PAGE]: 'heading-page',
      [HeadingLevel.SECTION_1]: 'heading-section-1',
      [HeadingLevel.SECTION_2]: 'heading-section-2',
      [HeadingLevel.SECTION_3]: 'heading-section-3',
    })
  })
})
