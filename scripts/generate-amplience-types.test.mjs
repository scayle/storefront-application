/**
 * Covers the two transforms in generate-amplience-types.mjs that a future schema
 * shape could silently break: the wrapper-name collision rename (what keeps
 * `VideoAsset` distinct from `Video`) and the cross-schema `$ref`-to-`import type`
 * rewriting (what stops every container inlining its leaf types as `Text1`,
 * `Divider1`, and so on).
 *
 * Everything else in the script is I/O around these two, and its result is the
 * committed output under src/shared/types/cms/amplience/gen/.
 */

import { describe, expect, it } from 'vitest'
import {
  buildImportBlock,
  getComponentRefUri,
  renameWrapperNameCollisions,
  rewriteComponentRefs,
} from './generate-amplience-types'

const uri = (name) => `https://scayle.com/schemas/${name}-component.json`

const registry = new Map([
  [
    uri('text'),
    {
      filePath: '/schemas/text-component.json',
      interfaceName: 'TextComponent',
      basename: 'text-component',
    },
  ],
  [
    uri('grid'),
    {
      filePath: '/schemas/grid-component.json',
      interfaceName: 'GridComponent',
      basename: 'grid-component',
    },
  ],
])

const wrappers = new Map([
  [
    uri('text'),
    {
      wrapperName: 'Text',
      componentType: 'text',
      propKey: 'text',
      basename: 'text-component',
      componentInterfaceName: 'TextComponent',
    },
  ],
])

const rewrite = (node, selfBasename = 'page-component') => {
  const imports = new Map()
  rewriteComponentRefs(node, registry, selfBasename, imports, wrappers)
  return { node, imports }
}

describe('renameWrapperNameCollisions', () => {
  it('renames a property whose title collides with its own wrapper name', () => {
    const schema = { properties: { video: { title: 'Video' } } }

    renameWrapperNameCollisions(schema, 'Video')

    expect(schema.properties.video.title).toBe('Video Asset')
  })

  it('compares titles after PascalCase normalization', () => {
    const schema = { properties: { asset: { title: 'rich text' } } }

    renameWrapperNameCollisions(schema, 'RichText')

    expect(schema.properties.asset.title).toBe('rich text Asset')
  })

  it('leaves non-colliding titles and untitled properties alone', () => {
    const schema = {
      properties: { poster: { title: 'Poster' }, meta: {} },
    }

    renameWrapperNameCollisions(schema, 'Video')

    expect(schema.properties.poster.title).toBe('Poster')
    expect(schema.properties.meta).toEqual({})
  })
})

describe('getComponentRefUri', () => {
  it('matches a direct $ref to a known schema', () => {
    expect(getComponentRefUri({ $ref: uri('text') }, registry)).toBe(
      uri('text'),
    )
  })

  it('matches a single-member allOf wrapper', () => {
    expect(
      getComponentRefUri({ allOf: [{ $ref: uri('grid') }] }, registry),
    ).toBe(uri('grid'))
  })

  it('matches a content relationship constrained to one content type', () => {
    const node = {
      allOf: [
        {
          // eslint-disable-next-line sonarjs/no-clear-text-protocols -- the vendor schema id is http, matching CONTENT_RELATIONSHIP_REFS
          $ref: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link',
        },
        { properties: { contentType: { enum: [uri('grid')] } } },
      ],
    }

    expect(getComponentRefUri(node, registry)).toBe(uri('grid'))
  })

  it('ignores refs to schemas outside the registry', () => {
    expect(
      getComponentRefUri({ $ref: uri('unknown') }, registry),
    ).toBeUndefined()
  })
})

describe('rewriteComponentRefs', () => {
  it('collapses a component ref to a tsType and records the import', () => {
    const { node, imports } = rewrite({
      properties: { grid: { $ref: uri('grid') } },
    })

    expect(node.properties.grid).toEqual({ tsType: 'GridComponent' })
    expect(imports.get('grid-component')).toEqual(new Set(['GridComponent']))
  })

  it('collapses a content wrapper to the shared wrapper type, not the raw component', () => {
    const { node, imports } = rewrite({
      properties: {
        items: {
          items: {
            oneOf: [
              {
                type: 'object',
                title: 'Text',
                properties: {
                  componentType: { const: 'text' },
                  text: { allOf: [{ $ref: uri('text') }] },
                },
              },
            ],
          },
        },
      },
    })

    expect(node.properties.items.items.oneOf[0]).toEqual({ tsType: 'Text' })
    expect(imports.get('text-component')).toEqual(new Set(['Text']))
  })

  it('does not import a type the generated module defines itself', () => {
    const { node, imports } = rewrite(
      { properties: { grid: { $ref: uri('grid') } } },
      'grid-component',
    )

    expect(node.properties.grid).toEqual({ tsType: 'GridComponent' })
    expect(imports.size).toBe(0)
  })

  it('leaves vendor refs in place so they keep being inlined', () => {
    const vendorRef =
      // eslint-disable-next-line sonarjs/no-clear-text-protocols -- the vendor schema id is http, matching CONTENT_RELATIONSHIP_REFS
      'http://bigcontent.io/cms/schema/v1/core#/definitions/image-link'
    const { node, imports } = rewrite({
      properties: { image: { $ref: vendorRef } },
    })

    expect(node.properties.image).toEqual({ $ref: vendorRef })
    expect(imports.size).toBe(0)
  })

  it('drops sibling keys on a collapsed node', () => {
    const { node } = rewrite({
      properties: {
        grid: { $ref: uri('grid'), title: 'Grid', description: 'A grid' },
      },
    })

    expect(node.properties.grid).toEqual({ tsType: 'GridComponent' })
  })
})

describe('buildImportBlock', () => {
  it('emits one sorted import line per module', () => {
    const imports = new Map([
      ['text-component', new Set(['Text', 'TextComponent'])],
      ['grid-component', new Set(['GridComponent'])],
    ])

    expect(buildImportBlock(imports)).toBe(
      `import type { GridComponent } from './grid-component'\n` +
        `import type { Text, TextComponent } from './text-component'\n\n`,
    )
  })

  it('emits nothing when there is nothing to import', () => {
    expect(buildImportBlock(new Map())).toBe('')
  })
})
