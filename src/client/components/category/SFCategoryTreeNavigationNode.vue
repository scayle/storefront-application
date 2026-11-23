<template>
  <SFLink
    v-bind="$attrs"
    :to="node.path"
    :aria-current="node.isActive ? 'page' : undefined"
    raw
    class="inline-block w-fit rounded-sm px-1 py-px text-lg duration-300 ease-out hover:bg-gray-200"
    :class="[
      isEmphasized ? 'font-semibold' : '',
      textColor,
      node.isActive ? 'bg-gray-200' : '',
    ]"
    preserve-state
    :except="['listNavigationCategories', 'treeNavigationCategories']"
  >
    {{ node.name }}
    <span v-if="isSale" class="inline-block -translate-y-0.5 text-sm">%</span>
  </SFLink>

  <ul v-if="node.children.length > 0">
    <li
      v-for="child in node.children"
      :key="`tree-nav-node-${child.path}`"
      class="mt-2"
      :class="{ 'ml-2.5': child.depth > 2 }"
    >
      <SFCategoryTreeNavigationNode
        :node="child"
        :has-sale-ancestor="hasSaleAncestor || node.isSale"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { CategoryTreeNavigationNode } from '@scayle/storefront/types'
import SFLink from '@client/components/ui/links/SFLink.vue'
import { computed } from 'vue'
// eslint-disable-next-line import-x/no-self-import
import SFCategoryTreeNavigationNode from './SFCategoryTreeNavigationNode.vue'

/**
 * Multi-root template (the node `SFLink` plus the conditional children `ul`).
 * Fallthrough attributes are bound to the `SFLink`, the always-present node row.
 */
defineOptions({ inheritAttrs: false })

const { node, hasSaleAncestor = false } = defineProps<{
  /** A node in the category tree containing the name, path, depth, active state, and children */
  node: CategoryTreeNavigationNode
  /**
   * Whether any ancestor of this node is a sale category. Set by the recursive
   * render below, so only the root of a sale branch is passed `false`.
   */
  hasSaleAncestor?: boolean
}>()

/**
 * The sale color marks where a sale branch starts. Every category below a sale
 * category is a sale category too, so styling all of them red would drown out
 * the entry point instead of highlighting it.
 */
const isSale = computed(() => !!node.isSale && !hasSaleAncestor)

/** Root categories and the active category are the emphasized rows of the tree. */
const isEmphasized = computed(() => node.isActive || node.depth === 1)

/**
 * Only the label color marks a sale branch. Its hover and active surface is the
 * same gray as every other row, so hovering behaves the same across the tree.
 */
const textColor = computed(() => {
  if (isSale.value) {
    return 'text-product-sale'
  }

  return isEmphasized.value ? 'text-primary' : 'text-secondary'
})
</script>
