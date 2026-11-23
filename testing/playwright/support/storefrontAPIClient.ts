import process from 'node:process'
import { StorefrontAPIClient as StorefrontApiSdkClient } from '@scayle/storefront-api'
import type {
  ProductsSearchEndpointResponseData,
  Product,
  Category,
  FilterItemWithValues,
  SearchEntity,
  Promotion,
  RFC33339Date,
} from '@scayle/storefront-api'

/** Matches the number list of a `categories.exists(...)` expression in a promotion condition. */
const CATEGORY_LIST_PATTERN =
  /categories\.exists\(\s*\w+\s*,\s*\w+ in \[([\d,\s]+)\]\)/g

/** Matches every `categories.exists(` expression in a promotion condition, readable or not. */
const CATEGORY_EXPRESSION_PATTERN = /categories\.exists\(/g

/**
 * Reads the category IDs from the `categories.exists(...)` lists of one promotion condition.
 *
 * @param condition The expression text of a promotion condition
 * @returns The category IDs in the order they appear, empty when the text has no such list
 */
function readCategoryIds(condition: string): number[] {
  const categoryIds: number[] = []

  for (const [, list] of condition.matchAll(CATEGORY_LIST_PATTERN)) {
    for (const id of list!.split(',')) {
      const trimmedId = id.trim()
      // A trailing comma leaves an empty piece, and Number('') would read it as category 0.
      if (trimmedId === '') {
        continue
      }
      const categoryId = Number(trimmedId)
      if (Number.isInteger(categoryId)) {
        categoryIds.push(categoryId)
      }
    }
  }

  return categoryIds
}

/** The part of an active campaign the promotion and search tests need. */
export type ActiveCampaign = { key: string; hideCountdown: boolean }

/**
 * Reads how many products a boolean filter matches when it is set to `true`.
 *
 * @param filters Filters the Storefront API returns for one category
 * @param slug Slug of the boolean filter, for example `sale`
 * @returns The product count of the `true` value, or 0 when the category has no such boolean filter
 */
const getBooleanFilterTrueCount = (
  filters: FilterItemWithValues[],
  slug: string,
): number => {
  const filter = filters.find(
    (item) => item.slug === slug && item.type === 'boolean',
  )
  if (filter?.type !== 'boolean') {
    return 0
  }

  return filter.values.find((value) => value.name === true)?.productCount ?? 0
}

/** How many categories the sale lookup asks the filters endpoint about at once. */
const SALE_LOOKUP_BATCH_SIZE = 10

/**
 * Lists categories depth first, each parent before its children.
 *
 * @param categories Categories loaded with their `children`
 * @returns All categories of the tree in one flat list
 */
const flattenCategories = (categories: Category[]): Category[] =>
  categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children ?? []),
  ])

type AttributeValues = { label: string } | { label: string }[] | undefined

/**
 * Reads the first label from a single- or multi-select attribute value.
 *
 * @param values Attribute `values` payload from Storefront API
 * @returns The first label, or an empty string when none is present
 */
const attributeValueLabel = (values: AttributeValues): string => {
  if (!values) {
    return ''
  }

  if (Array.isArray(values)) {
    return values[0]?.label ?? ''
  }

  return values.label ?? ''
}

/**
 * Reads a size label from the first variant that has one.
 *
 * @param product Product whose variants may include a size attribute
 * @returns Size label, or an empty string when none is present
 */
const variantSizeLabel = (product: Product): string => {
  for (const variant of product.variants ?? []) {
    const label = attributeValueLabel(variant.attributes?.size?.values)
    if (label) {
      return label
    }
  }

  return ''
}

/**
 * Collects category names that search typeahead is likely to recognize.
 * Prefers the parent of the leaf (e.g. "Jackets") over a very specific leaf.
 *
 * @param product Product with category path and/or category attributes
 * @returns Unique category names in preferred search order
 */
const categoryNamesForSearch = (product: Product): string[] => {
  const names: string[] = []
  const path = product.categories?.[0]

  if (path && path.length > 0) {
    if (path.length >= 2) {
      const parentName = path[path.length - 2]?.categoryName
      if (parentName) {
        names.push(parentName)
      }
    }

    const leafName = path[path.length - 1]?.categoryName
    if (leafName) {
      names.push(leafName)
    }
  }

  const categoryValues = product.attributes?.category?.values
  if (Array.isArray(categoryValues) && categoryValues.length > 0) {
    const entry =
      categoryValues.length >= 2
        ? categoryValues[categoryValues.length - 2]
        : categoryValues[0]
    const fromAttribute = entry?.label?.split('|').pop()?.trim()
    if (fromAttribute) {
      names.push(fromAttribute)
    }
  } else if (
    categoryValues &&
    !Array.isArray(categoryValues) &&
    categoryValues.label
  ) {
    const fromAttribute = categoryValues.label.split('|').pop()?.trim()
    if (fromAttribute) {
      names.push(fromAttribute)
    }
  }

  return [...new Set(names)]
}

/**
 * Builds candidate "color category size" search terms for a product.
 *
 * @param product Catalog product used to derive the term
 * @returns Lowercased terms of at least 3 characters, most specific first
 */
const descriptiveSearchTermsForProduct = (product: Product): string[] => {
  const color = attributeValueLabel(product.attributes?.color?.values)
  const size = variantSizeLabel(product)
  const terms: string[] = []

  for (const categoryName of categoryNamesForSearch(product)) {
    if (color && size) {
      terms.push(`${color} ${categoryName} ${size}`.toLowerCase())
      continue
    }

    if (color) {
      terms.push(`${color} ${categoryName}`.toLowerCase())
    }
  }

  return [...new Set(terms)].filter((term) => term.length >= 3)
}

/**
 * Checks whether a search entity is a category suggestion with filters (tags).
 *
 * @param entity Raw search v2 suggestion
 * @returns True when the suggestion would render `search-suggestion-tag-group`
 */
const hasCategoryFilterTags = (entity: SearchEntity): boolean => {
  if (entity.type !== 'category') {
    return false
  }

  return entity.categorySuggestion.filters.some(
    (filter) => filter.type === 'attribute' || filter.type === 'boolean',
  )
}

export class StorefrontAPIClient {
  private readonly client: StorefrontApiSdkClient

  /**
   * Creates a new StorefrontAPIClient instance for testing purposes.
   *
   * This constructor initializes the underlying Storefront API client with the provided
   * configuration for connecting to a specific shop's API.
   *
   * @param storefrontApiHost - The Storefront API host, without a scheme (e.g., 'my-shop.storefront.api.scayle.cloud')
   * @param shopId - The unique identifier for the shop
   * @param storefrontApiKey - The Storefront API key used to authenticate requests
   *
   * @example
   * const client = new StorefrontAPIClient(
   *   'my-shop.storefront.api.scayle.cloud',
   *   1918,
   *   process.env.STOREFRONT_API_KEY,
   * )
   */
  constructor(
    storefrontApiHost: string,
    shopId: number,
    storefrontApiKey: string,
  ) {
    this.client = new StorefrontApiSdkClient({
      host: storefrontApiHost,
      shopId,
      auth: {
        type: 'token',
        token: storefrontApiKey,
      },
    })
  }

  /**
   * Finds the first product that matches the given predicate function.
   * It searches through pages of products until a match is found.
   *
   * @param {(product: Product) => boolean} predicate - Predicate function to test against each product.
   * @param {{ includeHiddenCategories?: boolean }} [options] - With `includeHiddenCategories`, the
   *   `categories` of each product also list its hidden categories, for a predicate that matches
   *   a product by a category the shop does not show, such as the one a promotion lists. The
   *   categories then come without their properties, so a predicate reads only their IDs.
   * @returns {Promise<Product | undefined>} A product that matches the criteria, or undefined if none found.
   */
  async findProduct(
    predicate: (product: Product) => boolean,
    options: { includeHiddenCategories?: boolean } = {},
  ): Promise<Product | undefined> {
    const MAX_PAGES_TO_CHECK = 25
    const PRODUCTS_PER_PAGE = 25

    for (let page = 1; page <= MAX_PAGES_TO_CHECK; page++) {
      console.log(
        `Searching for a product on page ${page}... Using predicate function`,
      )

      const response: ProductsSearchEndpointResponseData =
        await this.client.products.query({
          with: {
            variants: {
              attributes: 'all',
            },
            siblings: 'all',
            attributes: 'all',
            categories: options.includeHiddenCategories
              ? { includeHidden: true }
              : 'all',
            sellableTimeframe: true,
          },
          pagination: { page, perPage: PRODUCTS_PER_PAGE },
        })

      const currentBatch = response.entities
      if (!currentBatch || currentBatch.length === 0) {
        break
      }

      const product = currentBatch.find(predicate)

      if (product) {
        console.log(`[SUCCESS] Found matching product with ID: ${product.id}`)
        return product
      }
    }

    return undefined
  }

  /**
   * Gets root categories from the API.
   *
   * @param parameters Optional parameters for retrieving root categories
   * @returns {Promise<Category[]>} Array of root categories
   */
  async getRootCategories(
    parameters: Parameters<typeof this.client.categories.getRoots>[0] = {},
  ) {
    return await this.client.categories.getRoots(parameters)
  }

  /**
   * Finds a descriptive search term whose search v2 suggestions include category
   * filter tags (color/size chips). Builds candidates from catalog color, category,
   * and size labels and confirms the API attaches filters. The UI only renders
   * `search-suggestion-tag-group` in that case.
   *
   * @returns A term of at least 3 characters, or undefined when none produce tags
   */
  async findSearchTermWithSuggestionFilterTags(): Promise<string | undefined> {
    const MAX_PAGES_TO_CHECK = 25
    const PRODUCTS_PER_PAGE = 25
    const MAX_SUGGESTION_LOOKUPS = 8
    const triedTerms = new Set<string>()
    let suggestionLookups = 0

    for (let page = 1; page <= MAX_PAGES_TO_CHECK; page++) {
      const response: ProductsSearchEndpointResponseData =
        await this.client.products.query({
          with: {
            variants: {
              attributes: 'all',
            },
            siblings: 'all',
            attributes: 'all',
            categories: 'all',
            sellableTimeframe: true,
          },
          pagination: { page, perPage: PRODUCTS_PER_PAGE },
        })

      const currentBatch = response.entities
      if (!currentBatch || currentBatch.length === 0) {
        break
      }

      for (const product of currentBatch) {
        if (
          !product.isActive ||
          !(
            product.variants?.some((variant) => variant.stock?.quantity > 1) ??
            false
          )
        ) {
          continue
        }

        for (const term of descriptiveSearchTermsForProduct(product)) {
          if (
            triedTerms.has(term) ||
            suggestionLookups >= MAX_SUGGESTION_LOOKUPS
          ) {
            continue
          }

          triedTerms.add(term)
          suggestionLookups += 1

          const suggestions = await this.client.searchv2.suggestions(term, {
            with: { categories: { parents: 'all' } },
          })

          if (suggestions.suggestions.some(hasCategoryFilterTags)) {
            console.log(
              `[SUCCESS] Found search term with suggestion filter tags: "${term}" (product ${product.id})`,
            )
            return term
          }
        }

        if (suggestionLookups >= MAX_SUGGESTION_LOOKUPS) {
          return undefined
        }
      }
    }

    return undefined
  }

  /**
   * Finds a product reference key that search v2 resolve maps to a product (PDP).
   * Enter only redirects to `/p/` when resolve returns a product; otherwise the
   * app opens the search results page. The first in-stock product's key is often
   * not indexed as an exact match.
   *
   * @returns A reference key of at least 3 characters, or undefined when none resolve
   */
  async findReferenceKeyThatResolvesToProduct(): Promise<string | undefined> {
    const MAX_PAGES_TO_CHECK = 25
    const PRODUCTS_PER_PAGE = 25
    const MAX_RESOLVE_LOOKUPS = 8
    const triedKeys = new Set<string>()
    let resolveLookups = 0

    for (let page = 1; page <= MAX_PAGES_TO_CHECK; page++) {
      const response: ProductsSearchEndpointResponseData =
        await this.client.products.query({
          with: {
            variants: {
              attributes: 'all',
            },
            attributes: 'all',
            sellableTimeframe: true,
          },
          pagination: { page, perPage: PRODUCTS_PER_PAGE },
        })

      const currentBatch = response.entities
      if (!currentBatch || currentBatch.length === 0) {
        break
      }

      for (const product of currentBatch) {
        if (
          !product.isActive ||
          !(
            product.variants?.some((variant) => variant.stock?.quantity > 1) ??
            false
          )
        ) {
          continue
        }

        const referenceKey = product.referenceKey?.trim()
        if (
          !referenceKey ||
          referenceKey.length < 3 ||
          triedKeys.has(referenceKey)
        ) {
          continue
        }

        if (resolveLookups >= MAX_RESOLVE_LOOKUPS) {
          return undefined
        }

        triedKeys.add(referenceKey)
        resolveLookups += 1

        const resolved = await this.client.searchv2.resolve(referenceKey)

        if (resolved?.type === 'product') {
          console.log(
            `[SUCCESS] Found reference key that resolves to a product: "${referenceKey}" (product ${product.id})`,
          )
          return referenceKey
        }
      }
    }

    return undefined
  }

  /**
   * Finds the name of a category that search v2 resolve maps to a category (PLP). Enter on such
   * a term redirects to the category page, so the term fits tests that check where a search
   * lands. Candidates are the root categories and their children, and the helper gives up after
   * 8 search v2 lookups.
   *
   * @returns A category name of at least 3 characters, or undefined when none resolve
   */
  async findCategoryNameThatResolvesToCategory(): Promise<string | undefined> {
    const MAX_RESOLVE_LOOKUPS = 8
    const rootCategories = await this.getRootCategories({
      with: { children: 1 },
    })
    const candidates = rootCategories.flatMap((rootCategory) => [
      rootCategory,
      ...(rootCategory.children ?? []),
    ])

    for (const category of candidates.slice(0, MAX_RESOLVE_LOOKUPS)) {
      const name = category.name?.trim()
      if (!name || name.length < 3) {
        continue
      }

      const resolved = await this.client.searchv2.resolve(name)
      if (resolved?.type === 'category') {
        console.log(
          `[SUCCESS] Found category name that resolves to a category: "${name}" (category ${category.id})`,
        )
        return name
      }
    }

    return undefined
  }

  /**
   * Asks search v2 resolve where a search term leads when it belongs to a navigation item with an
   * external link ("Individual link" target). The answer comes from the Storefront API and not from
   * the shop under test, so a test can tell missing shop data from a shop that stopped redirecting.
   *
   * @param term The search term, for example the navigation synonym of the external link item.
   * @returns The external `https` URL, or undefined when the term resolves to anything else.
   */
  async resolveExternalSearchTerm(term: string): Promise<URL | undefined> {
    const resolved = await this.client.searchv2.resolve(term)
    if (resolved?.type !== 'navigationItem') {
      return undefined
    }

    const navigationItem = resolved.navigationItemSuggestion?.navigationItem
    if (
      navigationItem?.type !== 'individual-link' &&
      navigationItem?.type !== 'external'
    ) {
      return undefined
    }

    // An Individual link can hold a site-relative path such as `/sale`, which is not an external URL.
    let url: URL
    try {
      url = new URL(navigationItem.options.url)
    } catch {
      return undefined
    }
    return url.protocol === 'https:' ? url : undefined
  }

  /**
   * Finds a search term that search v2 resolve does not map to a category, product or
   * navigation item, and that still matches products. Enter on such a term opens the
   * search results page. A term that resolves redirects to that entity instead, so a
   * generic word from a product name (e.g. "sneaker") can land on a category page.
   * Candidates are the words of active product names, split on anything that is not a
   * letter or digit. Like the results page, the lookups send the active campaign key, and
   * the product match only counts products that are sellable now. The helper gives up
   * after 12 search v2 lookups and logs the words it tried.
   *
   * @returns A lowercased term of at least 3 characters, or undefined when none qualify
   */
  async findSearchTermThatOpensResultsPage(): Promise<string | undefined> {
    const MAX_PAGES_TO_CHECK = 25
    const PRODUCTS_PER_PAGE = 25
    const MAX_RESOLVE_LOOKUPS = 12
    const triedTerms = new Set<string>()
    let resolveLookups = 0
    const campaignKey = (await this.getActiveCampaign())?.key
    const sellableAt = new Date().toISOString() as RFC33339Date

    for (let page = 1; page <= MAX_PAGES_TO_CHECK; page++) {
      const response: ProductsSearchEndpointResponseData =
        await this.client.products.query({
          with: { attributes: 'all' },
          pagination: { page, perPage: PRODUCTS_PER_PAGE },
        })

      const currentBatch = response.entities
      if (!currentBatch || currentBatch.length === 0) {
        break
      }

      for (const product of currentBatch) {
        if (!product.isActive) {
          continue
        }

        const name = attributeValueLabel(product.attributes?.name?.values)
        for (const word of name.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
          if (word.length < 3 || triedTerms.has(word)) {
            continue
          }

          if (resolveLookups >= MAX_RESOLVE_LOOKUPS) {
            console.warn(
              `[WARN] No search term opens the results page after ${resolveLookups} lookups: ${[...triedTerms].join(', ')}`,
            )
            return undefined
          }

          triedTerms.add(word)
          resolveLookups += 1

          const resolved = await this.client.searchv2.resolve(word, {
            campaignKey,
          })
          if (resolved?.type !== undefined) {
            continue
          }

          const matches = await this.client.products.query({
            where: { term: word, sellableAt },
            campaignKey,
            pagination: { page: 1, perPage: 1 },
          })
          if (matches.pagination.total > 0) {
            console.log(
              `[SUCCESS] Found search term that opens the results page: "${word}" (product ${product.id})`,
            )
            return word
          }
        }
      }
    }

    return undefined
  }

  /**
   * Gets the product count for a specific category.
   *
   * @param categoryId The ID of the category to check
   * @returns {Promise<number>} The total number of products in the category
   */
  async getCategoryProductCount(categoryId: number): Promise<number> {
    const response = await this.client.products.query({
      where: { categoryId },
      pagination: { page: 1, perPage: 1 },
    })
    return response.pagination.total
  }

  /**
   * Finds a category with more than the specified minimum number of products.
   * Searches through root categories and their children recursively.
   *
   * @param minProducts The minimum number of products required
   * @returns {Promise<Category | undefined>} A category with enough products, or undefined if none found
   */
  async findCategoryWithProducts(
    minProducts: number,
  ): Promise<Category | undefined> {
    const rootCategories = await this.getRootCategories()

    for (const rootCategory of rootCategories) {
      // Check the root category itself
      const rootProductCount = await this.getCategoryProductCount(
        rootCategory.id,
      )
      if (rootProductCount >= minProducts) {
        console.log(
          `Found root category "${rootCategory.name}" with ${rootProductCount} products`,
        )
        return rootCategory
      }

      // Check children if they exist
      if (rootCategory.children && rootCategory.children.length > 0) {
        for (const childCategory of rootCategory.children) {
          const childProductCount = await this.getCategoryProductCount(
            childCategory.id,
          )
          if (childProductCount >= minProducts) {
            console.log(
              `Found child category "${childCategory.name}" with ${childProductCount} products`,
            )
            return childCategory
          }
        }
      }
    }

    console.log(`No category found with at least ${minProducts} products`)
    return undefined
  }

  /**
   * Finds a category whose `sale` filter matches at least one product.
   * Asks the filters endpoint, which is what the listing page renders, because
   * a product can carry a sale reduction while the computed `sale` filter still
   * counts it as 0. The listing only shows the sale switch when the count is above 0.
   * Searches root categories and their descendants down to three levels below
   * the root. The requests run in batches of `SALE_LOOKUP_BATCH_SIZE`, so a shop
   * without a match costs one round trip per batch, and the first match in tree
   * order wins.
   *
   * @returns A category with sale products, or undefined when no category matches
   */
  async findCategoryWithSaleProducts(): Promise<Category | undefined> {
    const rootCategories = await this.getRootCategories({
      with: { children: 3 },
    })
    const categories = flattenCategories(rootCategories)

    for (
      let start = 0;
      start < categories.length;
      start += SALE_LOOKUP_BATCH_SIZE
    ) {
      const batch = categories.slice(start, start + SALE_LOOKUP_BATCH_SIZE)
      const saleProductCounts = await Promise.all(
        batch.map(async (category) =>
          getBooleanFilterTrueCount(
            await this.client.filters.get({
              where: { categoryId: category.id },
            }),
            'sale',
          ),
        ),
      )
      const matchIndex = saleProductCounts.findIndex((count) => count > 0)
      if (matchIndex !== -1) {
        console.log(
          `Found category "${batch[matchIndex].name}" with ${saleProductCounts[matchIndex]} sale products`,
        )
        return batch[matchIndex]
      }
    }

    console.log('No category found whose sale filter matches a product')
    return undefined
  }

  /**
   * Picks the first color that still matches a product in the category once the
   * price limit is applied, so a deep-link with both filters has a listing to show.
   *
   * @param categoryId The category the deep-link opens
   * @param colorIds Color attribute value IDs to try, in order
   * @param maxPrice The price limit the deep-link adds
   * @returns The first color ID with at least one product, or undefined when none has
   */
  async findColorWithProducts(
    categoryId: number,
    colorIds: string[],
    maxPrice: number,
  ): Promise<string | undefined> {
    for (const colorId of colorIds) {
      const response = await this.client.products.query({
        where: {
          categoryId,
          maxPrice,
          attributes: [
            { type: 'attributes', key: 'color', values: [Number(colorId)] },
          ],
        },
        pagination: { page: 1, perPage: 1 },
      })
      if (response.pagination.total > 0) {
        return colorId
      }
    }

    return undefined
  }

  /**
   * Finds a subcategory (child category) with its parent category.
   * Searches through root categories and their children to find a child category
   * that has at least the specified minimum number of products.
   *
   * @param minProducts The minimum number of products required in the subcategory
   * @returns {Promise<{ parent: Category; child: Category } | undefined>} An object containing the parent and child categories, or undefined if none found
   */
  async findSubcategoryWithParent(
    minProducts: number,
  ): Promise<{ parent: Category; child: Category } | undefined> {
    const rootCategories = await this.getRootCategories({
      with: { children: 1 },
    })

    for (const rootCategory of rootCategories) {
      // Check children if they exist
      for (const childCategory of rootCategory.children ?? []) {
        const childProductCount = await this.getCategoryProductCount(
          childCategory.id,
        )
        if (childProductCount >= minProducts) {
          console.log(
            `Found subcategory "${childCategory.name}" (parent: "${rootCategory.name}") with ${childProductCount} products`,
          )
          return { parent: rootCategory, child: childCategory }
        }
      }
    }

    console.log(
      `No subcategory found with at least ${minProducts} products and a parent category`,
    )
  }

  /**
   * Finds a product with siblings from a list of product IDs.
   * This is useful when you have product IDs from the DOM and need to find one with siblings.
   *
   * Uses a two-pass approach to optimize resource usage:
   * 1. First pass: Query lightweight data (siblings only) to identify matching product
   * 2. Second pass: Fetch full details only for the matching product
   *
   * @param productIds Array of product IDs to check
   * @param predicate Optional predicate function to filter products. Defaults to finding products with siblings.
   * @returns {Promise<Product | undefined>} A product with siblings, or undefined if none found
   */
  async findProductWithSiblingsFromIds(
    productIds: number[],
    predicate: (product: Product) => boolean = (product) =>
      Boolean(
        product.isActive && product.siblings && product.siblings.length > 1,
      ),
  ): Promise<Product | undefined> {
    if (productIds.length === 0) {
      return
    }

    // First pass: Query lightweight data to find matching product
    const lightweightProducts = await this.client.products.getByIds(
      productIds,
      {
        with: {
          siblings: 'all',
        },
      },
    )

    const matchingProduct = lightweightProducts.find(predicate)

    if (!matchingProduct) {
      return
    }

    // Second pass: Fetch full details only for the matching product
    const fullProduct = await this.client.products.getById(matchingProduct.id, {
      with: {
        variants: {
          attributes: 'all',
        },
        siblings: 'all',
        attributes: 'all',
        categories: 'all',
      },
    })

    console.log(
      `[SUCCESS] Found product with siblings (ID: ${fullProduct.id}) from provided product IDs`,
    )

    return fullProduct
  }

  /**
   * Finds a product with multiple images from a list of product IDs.
   * Used when you have product IDs from the PLP DOM and need one that has an image slider (2+ images).
   *
   * @param productIds Array of product IDs to check
   * @returns {Promise<Product | undefined>} A product with multiple images, or undefined if none found
   */
  async findProductWithMultipleImagesFromIds(
    productIds: number[],
  ): Promise<Product | undefined> {
    if (productIds.length === 0) {
      return
    }

    const products = await this.client.products.getByIds(productIds, {
      with: {},
    })

    const matchingProduct = products.find(
      (p) => Array.isArray(p.images) && p.images.length > 1,
    )

    if (!matchingProduct) {
      return
    }

    console.log(
      `[SUCCESS] Found product with multiple images (ID: ${matchingProduct.id}, ${
        matchingProduct.images!.length
      } images) from provided product IDs`,
    )

    return matchingProduct
  }

  /**
   * Retrieves the promotions active right now for an anonymous user, the same
   * way the Storefront Application fetches them for the promotion ribbon and
   * flyout: the first 10.
   * The promotion tests use it to skip themselves on a shop with no active promotion, the
   * promotion price test (C2167321) reads the categories of its promotions, and the tenant data
   * spec checks that those categories still exist.
   *
   * @returns Active promotions, or an empty array when none are running
   */
  async getActivePromotions(): Promise<Promotion[]> {
    const response = await this.client.promotions.get({
      activeAt: new Date().toISOString() as RFC33339Date,
      pagination: { perPage: 10 },
    })

    return response.entities
  }

  /**
   * Reads the category IDs that the conditions of a promotion list, for example the `75552` in
   * `item.product.categories.exists(c, c in [75552])`. The Storefront API gives promotion
   * conditions only as expression text, so the IDs come from that text: only the number list of a
   * `categories.exists(...)` expression counts, so lists of product or attribute IDs are not read
   * as categories. A promotion without such an expression returns an empty array.
   *
   * @param promotion The promotion whose conditions to read
   * @returns The IDs from the `categories.exists(...)` lists, without duplicates
   */
  getPromotionCategoryIds(promotion: Promotion): number[] {
    return [
      ...new Set(
        promotion.conditions.flatMap(({ condition }) =>
          readCategoryIds(condition),
        ),
      ),
    ]
  }

  /**
   * Finds the conditions of a promotion with a `categories.exists(` expression whose list
   * `getPromotionCategoryIds` does not read, for example a changed spelling of the expression or
   * an empty list. It compares the number of such expressions with the number of lists read, so
   * one unreadable expression next to a readable one is found too. A check that relies on the IDs
   * uses it to fail instead of passing without looking at everything.
   *
   * @param promotion The promotion whose conditions to check
   * @returns The condition texts with at least one unread `categories.exists(` expression, empty when every one is read
   */
  findUnreadCategoryConditions(promotion: Promotion): string[] {
    return promotion.conditions
      .map(({ condition }) => condition)
      .filter(
        (condition) =>
          (condition.match(CATEGORY_EXPRESSION_PATTERN)?.length ?? 0) >
          [...condition.matchAll(CATEGORY_LIST_PATTERN)].length,
      )
  }

  /**
   * Finds the categories among the given IDs that the Storefront API does not know. Promotions
   * keep pointing at a category after it is deleted. A hidden category counts as known, because
   * the Storefront API only returns it by ID when asked to include hidden categories.
   *
   * @param categoryIds The category IDs to look up
   * @returns The IDs that answered 404. Any other error is thrown, so an outage is not reported as missing categories.
   */
  async findMissingCategoryIds(categoryIds: number[]): Promise<number[]> {
    const missingCategoryIds: number[] = []

    for (const categoryId of categoryIds) {
      try {
        await this.client.categories.getById(categoryId, {
          includeHidden: true,
        })
      } catch (error) {
        if ((error as { status?: number }).status !== 404) {
          throw error
        }
        missingCategoryIds.push(categoryId)
      }
    }

    return missingCategoryIds
  }

  /**
   * Retrieves the campaign active right now, using the same `[startsAt, endsAt)`
   * window as `isCampaignActive` from `@scayle/storefront`, which the Storefront
   * Application uses. Like the application, it searches the first page of
   * campaigns only.
   * The ribbon test uses it because the ribbon also shows for a campaign.
   *
   * @returns The first active campaign, or undefined when none is running
   */
  async getActiveCampaign(): Promise<ActiveCampaign | undefined> {
    const response = await this.client.campaigns.get()
    const now = Date.now()

    return response.entities.find((campaign) => {
      const startsAt = Date.parse(campaign.startsAt ?? '')
      const endsAt = Date.parse(campaign.endsAt ?? '')

      return startsAt <= now && now < endsAt
    })
  }

  /**
   * Gets the URL path for a category to navigate to it in the storefront.
   *
   * @param category The category to get the path for
   * @returns The path relative to the country-scoped `baseURL`, for example `c/shoes-123`
   */
  getCategoryPath(category: Category): string {
    // Build the path from the category's slug
    return `c/${category.slug}-${category.id}`
  }
}

/**
 * Builds a Storefront API client for one shop country.
 *
 * @param shopId The shop country ID the client reads the catalog of.
 * @returns A client built from `STOREFRONT_API_KEY` and `STOREFRONT_TENANT_SPACE`.
 * @throws When one of the two environment variables is not set.
 */
export function createStorefrontAPIClient(shopId: number): StorefrontAPIClient {
  const storefrontApiKey = process.env.STOREFRONT_API_KEY
  if (!storefrontApiKey) {
    throw new Error(
      'STOREFRONT_API_KEY is not set. The Storefront API client needs it to look up test products.',
    )
  }

  const tenantSpace = process.env.STOREFRONT_TENANT_SPACE
  if (!tenantSpace) {
    throw new Error(
      'STOREFRONT_TENANT_SPACE is not set (e.g. my-shop). The Storefront API client builds its host from it.',
    )
  }

  // The host the `contextMiddleware` in `@scayle/storefront` builds from the
  // application's `tenantSpace`.
  const storefrontApiHost = `${tenantSpace}.storefront.api.scayle.cloud`

  return new StorefrontAPIClient(storefrontApiHost, shopId, storefrontApiKey)
}
