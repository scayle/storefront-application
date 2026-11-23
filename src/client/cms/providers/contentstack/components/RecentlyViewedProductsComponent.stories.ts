import RecentlyViewedProductsComponent from './RecentlyViewedProductsComponent.vue'

/**
 * Contentstack Recently Viewed Products component displays products the user
 * has previously viewed using the useRecentlyViewedProducts composable.
 * The padding around the slider is configurable via the CMS.
 *
 * This component wraps SFProductSlider with specific configuration for recently viewed products.
 * Since this is a wrapper component, all visual examples and story variants can be found in the
 * base component's story.
 *
 * @see {@link ../../../../../../components/product/slider/SFProductSlider.stories.ts} - Base component story with detailed examples
 */
export default {
  title: 'CMS Contentstack/RecentlyViewedProducts',
  component: RecentlyViewedProductsComponent,
}

export const DocsOnly = {}
