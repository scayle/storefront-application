import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CategoryTreeNavigationNode } from '@scayle/storefront/types'
import { SFLinkStub } from '@test/stubs/common'
import SFCategoryTreeNavigationNode from './SFCategoryTreeNavigationNode.vue'

const buildNode = (
  node: Partial<CategoryTreeNavigationNode> & { name: string; depth: number },
): CategoryTreeNavigationNode => ({
  path: `/c/${node.name.toLowerCase()}`,
  isActive: false,
  isSale: false,
  children: [],
  ...node,
})

const globalConfig = { stubs: { SFLink: SFLinkStub } }

const mountNode = (node: CategoryTreeNavigationNode) =>
  mount(SFCategoryTreeNavigationNode, { props: { node }, global: globalConfig })

describe('SFCategoryTreeNavigationNode', () => {
  it('links every category of the tree to its path', () => {
    const wrapper = mountNode(
      buildNode({
        name: 'Women',
        depth: 1,
        children: [
          buildNode({
            name: 'Tops',
            depth: 2,
            children: [buildNode({ name: 'Shirts', depth: 3 })],
          }),
        ],
      }),
    )

    expect(
      wrapper
        .findAll('a')
        .map((link) => [link.text(), link.attributes('href')]),
    ).toEqual([
      ['Women', '/c/women'],
      ['Tops', '/c/tops'],
      ['Shirts', '/c/shirts'],
    ])
  })

  // Every category below a sale category is a sale category too, so only the
  // entry point of a sale branch carries the sale sign and color.
  it.for([
    {
      description: 'root sale category with sale children',
      node: buildNode({
        name: 'Sale',
        depth: 1,
        isSale: true,
        children: [
          buildNode({ name: 'Tops', depth: 2, isSale: true }),
          buildNode({ name: 'Jackets', depth: 2, isSale: true }),
        ],
      }),
      expectedLabels: ['Sale %', 'Tops', 'Jackets'],
    },
    {
      description: 'sale category under a non-sale parent',
      node: buildNode({
        name: 'Women',
        depth: 1,
        children: [
          buildNode({
            name: 'Sale',
            depth: 2,
            isSale: true,
            children: [buildNode({ name: 'Tops', depth: 3, isSale: true })],
          }),
        ],
      }),
      expectedLabels: ['Women', 'Sale %', 'Tops'],
    },
    {
      description: 'active sale root',
      node: buildNode({ name: 'Sale', depth: 1, isSale: true, isActive: true }),
      expectedLabels: ['Sale %'],
    },
    {
      description: 'non-sale tree',
      node: buildNode({
        name: 'Women',
        depth: 1,
        children: [buildNode({ name: 'Tops', depth: 2, isActive: true })],
      }),
      expectedLabels: ['Women', 'Tops'],
    },
  ])(
    'shows the sale sign and color only where a sale branch starts: $description',
    ({ node, expectedLabels }) => {
      const links = mountNode(node).findAll('a')

      expect(links.map((link) => link.text())).toEqual(expectedLabels)
      expect(
        links
          .filter((link) => link.classes('text-product-sale'))
          .map((link) => link.text()),
      ).toEqual(expectedLabels.filter((label) => label.endsWith('%')))
    },
  )

  it('marks only the active category as the current page', () => {
    const wrapper = mountNode(
      buildNode({
        name: 'Women',
        depth: 1,
        children: [
          buildNode({ name: 'Tops', depth: 2, isActive: true }),
          buildNode({ name: 'Jeans', depth: 2 }),
        ],
      }),
    )

    expect(
      wrapper.findAll('a').map((link) => link.attributes('aria-current')),
    ).toEqual([undefined, 'page', undefined])
  })
})
