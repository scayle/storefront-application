import { HeadingLevel, HeadlineTag } from '@client/utils/constants'

const HEADING_LEVEL_BY_TAG: Partial<Record<HeadlineTag, HeadingLevel>> = {
  [HeadlineTag.H1]: HeadingLevel.PAGE,
  [HeadlineTag.H2]: HeadingLevel.SECTION_1,
  [HeadlineTag.H3]: HeadingLevel.SECTION_2,
  [HeadlineTag.H4]: HeadingLevel.SECTION_3,
}

const isHeadlineTag = (value: string): value is HeadlineTag =>
  Object.values(HeadlineTag).includes(value as HeadlineTag)

/**
 * Normalizes a CMS-authored text type into a heading tag.
 *
 * @param textType Raw `textType` field from the CMS payload
 * @returns A heading tag, or `HeadlineTag.P` when `textType` is missing or not
 *   a recognized heading tag
 */
export const resolveHeadingTag = (
  textType: string | undefined,
): HeadlineTag => {
  const normalized = textType ?? 'p'
  return isHeadlineTag(normalized) && normalized in HEADING_LEVEL_BY_TAG
    ? normalized
    : HeadlineTag.P
}

/**
 * Resolves the heading level for a heading tag.
 *
 * @param tag Heading tag from `resolveHeadingTag`
 * @returns Heading level, or `undefined` when `tag` is a paragraph
 */
export const resolveHeadingLevel = (
  tag: HeadlineTag,
): HeadingLevel | undefined => HEADING_LEVEL_BY_TAG[tag]

/** Typography class for each heading level. */
export const HEADING_CLASS_BY_LEVEL: Record<HeadingLevel, string> = {
  [HeadingLevel.PAGE]: 'heading-page',
  [HeadingLevel.SECTION_1]: 'heading-section-1',
  [HeadingLevel.SECTION_2]: 'heading-section-2',
  [HeadingLevel.SECTION_3]: 'heading-section-3',
}
