# Styling

The SCAYLE Resource Center covers [Theming](https://scayle.dev/documentation/storefront/storefront-application-v3/getting-started/theming) and the [Design System](https://scayle.dev/documentation/storefront/storefront-application-v3/getting-started/design-system).

You change the look of your shop by editing the design tokens in `src/client/design-tokens.css`.
Components style themselves with Tailwind CSS v4 utility classes, and the utility classes for
colors, font sizes and spacing read the tokens, so a changed token reaches every component that
uses its class without touching the components themselves.

The tokens come from the official [SCAYLE Storefront Design System on Figma](https://www.figma.com/community/file/1704456348909703435/scayle-storefront-design-system). Open it to see
the colors, spacing, and components the tokens and components are based on.

## What you can change in the SCAYLE Panel

- Set the colors of a price campaign's badges and banners in its settings in the SCAYLE Panel.
  Without them, `--color-campaign` and `--color-primary` apply.
- Set the colors of a promotion's banner, ribbon and badge in the SCAYLE Panel, with the
  "Promotion Design" toggle and its "Colors" section on a saved promotion. Without them,
  `--color-promotion` and `--color-primary` apply.
- Give a navigation link its own color with a `linkColor` custom data field on the navigation item
  in the SCAYLE Panel. Add the field in the custom data settings first (see
  [Custom data](https://scayle.dev/documentation/advanced/customize-and-extend/custom-data)).
- Choose a CMS section's background color, padding and alignment, a grid block's column count and
  gaps, and a single product block's background and text colors, in the CMS entry. This applies to
  the Amplience, Contentful, Contentstack and Storyblok providers.

## How a token becomes CSS

Most tokens become a CSS variable on `:root`, and the utilities that use them read that variable
(see [Tailwind CSS: Theme variables](https://tailwindcss.com/docs/theme)).

Some values don't stay a variable:

| Value                                                      | In the shipped CSS                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Most tokens in the `@theme` block                          | A variable on `:root`, emitted only when used. Utilities read it with `var()`.                                  |
| Box shadows (`--shadow-*`)                                 | The literal value, written into each `shadow-*` utility at build time. No variable on `:root`.                  |
| Breakpoints in the `@theme static` block                   | A variable on `:root`, always emitted, so `useDefaultBreakpoints` can read them at runtime.                     |
| Breakpoints inside variants such as `lg:` and in `theme()` | The literal value, written into the `@media` query at build time. CSS variables cannot appear in a media query. |

So colors, type sizes, spacing, and rounded corners can change at runtime, while shadows and
breakpoints are fixed at build time. Setting `--shadow-input` on an element has no effect, and
setting `--breakpoint-lg` doesn't change the `lg:` variants.

A token whose value is another variable resolves on `:root`, where it is declared. For example,
`--color-dot-inactive: var(--color-gray-400)` keeps the original `--color-gray-400` value even
inside an element that sets its own `--color-gray-400`. If you need such an alias to follow a local
override, declare it in a `@theme inline` block, which makes the utility read the referenced
variable directly.

## Overriding tokens

### Change a value

Edit the value where it is declared in `src/client/design-tokens.css`. Every utility that reads the
token follows. If you change a type size such as `--text-lg`, change its line height
`--text-lg--line-height` too, since each size declares its own and keeps it when only the size
changes.

### Change the font

The Storefront Application V3 self-hosts Inter through the `@fontsource-variable/inter` package. To
use your own typeface, change these together:

- The `@import '@fontsource-variable/inter'` line at the top of `src/client/index.css`. Replace it
  with your own `@font-face` rules or another font package, and remove the Inter package from
  `package.json`.
- `--font-sans` in `src/client/design-tokens.css`, which sets the page's default font family.
- `INTER_LATIN_FONT_PATTERN` in `vite.config.ts`, which tells the build which font file to preload.
  Point it at your main font file, or the page preloads nothing. The pattern has to match a
  `.woff2` file, since the preload link always declares `type="font/woff2"`. The build can only
  preload a font file it bundles, one from a package or a relative `url()`, not one from `public/`.
- `fontSrc` in `src/server/middleware/securityHeaders.ts`, if your font files come from another
  origin. It allows your own origin only. A font service that serves a stylesheet needs that origin
  in `styleSrc` too.

The typography utilities in `index.css` use Tailwind's default font weights (`font-normal` at 400,
`font-semibold` at 600). If your typeface has other weights, adjust those utilities or declare your
own `--font-weight-*` tokens.

### Override colors on a section or a shop

Setting a color variable on an element changes every utility inside it that reads the variable. Put
the rule in `index.css` and the class on the section's root element.

This dark section customizes `primary` and `white`, and lightens `secondary` so muted text stays
readable on the dark background:

```css
/* File: src/client/index.css */
.campaign-dark {
  --color-primary: #ffffff;
  --color-secondary: #d9d9d9;
  --color-white: #171717;
}
```

```vue
<section class="campaign-dark bg-white text-primary">
  <!-- Section content -->
</section>
```

If you change a color token on a section, check the components inside it, since a token changes
both the text and the backgrounds that use it. The primary button is `bg-primary text-white`, so
changing only `primary` to white would make it white on white. Swapping `primary` and `white`
together keeps it readable.

If you want plain text in the section to change color too, give the element its own `text-primary`.
Plain text takes its color from `body`, which already has the original color worked out, so it
doesn't follow the new variable.

If you want different colors for each shop, put the overrides under a marker that only that shop's
pages carry. All shops share one CSS file, so the marker is what keeps one shop's colors away from
the others:

1. Mark the shop on the root element of both layouts in `src/client/layout/`, for example with a
   `data-shop-country` attribute bound to `page.props.storefront.country.shopCountryId`. A shop with
   several shop countries has one ID for each.
2. In `index.css`, override the color variables under that attribute, the same way as
   `.campaign-dark` above.
3. Give the same element `text-primary` and a background utility such as `bg-white`. Without them,
   plain text keeps the color from `body` and the page shows the browser's default background.
4. If the navigation progress bar should change color too, set `--color-accent` on `body`. Inertia
   adds the bar to `body`, outside the layout, so the layout's overrides don't reach it.
5. Open a page of the shop. It shows its own colors, while the other shops keep the defaults.

The error page keeps the default colors in every shop. `src/client/pages/Error.vue` renders without
a layout and doesn't receive the `storefront` prop, so it can't tell which shop it belongs to.

Shadows and breakpoints can't differ per shop this way, since their values are fixed at build time.

### Remove Tailwind's default values

The `@theme` blocks add to Tailwind's default theme, they don't replace it, unless a namespace is
reset. `design-tokens.css` already resets the colors (`--color-*`) and the type sizes (`--text-*`),
so only the tokens compile there, and a default class such as `text-zinc-500` or `text-5xl`
produces no CSS.

The other namespaces keep Tailwind's defaults, and the application relies on them, mainly the font
weights (`font-semibold`, `font-normal`, `font-bold`) and the radius scale (`rounded-sm` to
`rounded-2xl`). It also uses shadows such as `shadow-xl`, container widths, line heights and easing
curves.

To keep only your own tokens in one of these namespaces, reset it the same way:

```css
/* File: src/client/design-tokens.css */
@theme {
  /* Add this line */
  --radius-*: initial;

  --radius-sm: 0.25rem;
  /* Your other radius tokens */
}
```

Before you reset a namespace, search `src/` for the default classes it provides, since a reset breaks
them in different ways:

- In a template, a class whose token no longer exists produces no CSS and no error. The element just
  loses that style.
- In an `@apply` in `index.css`, it fails the build. The utilities there apply `font-semibold`,
  `font-normal`, `rounded-md` and `rounded-lg`, so if you reset `--font-weight-*` or `--radius-*`,
  declare those tokens again.
- The `container` utility reads `var(--container-7xl)`, and nothing warns you if that token is gone.
  If you reset `--container-*`, declare it again, or the page width stops being capped.

### Change a breakpoint

The `@theme static` block declares four breakpoints, `sm` to `xl`. Tailwind's own `2xl` breakpoint at
`96rem` stays available alongside them. The breakpoints are in rem, so they follow the font size the
user sets in their browser.

If you want a component to switch layout at a different breakpoint, change the variant in that
component, for example `max-lg:hidden` to `max-md:hidden`.

If you want to change the width of a breakpoint itself, edit its token, and update these places in
the same change, since they repeat the value outside Tailwind:

- `DEFAULT_BREAKPOINTS` in `src/client/composables/useDefaultBreakpoints.ts`, the fallback used during
  server rendering.
- The `sizes` conditions in `src/shared/constants/imageVariants.ts`. Some slot widths there derive
  from the container's maximum width (`--container-7xl`, the same 80rem as `xl`) and its padding, so
  recalculate them if you change either.
- The `media` attributes of the image, section and video components of the Amplience, Contentful,
  Contentstack and Storyblok providers in `src/client/cms/providers/<provider>/components/`.
- The pixel widths in `src/client/cms/shared/image.ts`, which set the CMS image `srcset`, `sizes` and
  the container padding switch.
- The pixel `media` condition on the image preload link in `SFProductGallery`.
- The pixel `BREAKPOINTS` in `config/ui.ts` and the viewport widths in the Playwright tests under
  `testing/playwright/`.
- The unit tests, stories, and code comments that repeat these values. Search for the rem and pixel
  values to find them.

If you miss one, images load at the wrong size, or a component switches layout at a different width
than the rest of the page. The copies in pixels also don't follow the user's browser font size the
way the rem tokens do.

## Colors the tokens don't reach

Some colors come from data or from fixed values, so a token change doesn't reach them:

- CMS sections take their background color from the CMS entry as an inline style, and single
  product blocks take a background and a text color too.
- Deal components, such as `SFDealBanner` and `SFDealRibbon`, take their colors from the promotion's
  or campaign's data. They use the `--color-promotion`, `--color-campaign` and `--color-primary`
  tokens only when the data has no color.
- Navigation links can take a color from the navigation item's data.
- The filter color swatches use the fixed colors in `FILTER_COLORS` in `src/client/constants/index.ts`.
- The empty-state illustration in `src/client/assets/icons/empty/basket.svg`, which the empty
  basket, wishlist and order pages show, and the image placeholder are SVG files with fixed fills.
- A few utilities in `index.css` use literal white or black: `scroll-shadow` and
  `input-white-autofill`. The `scroll-fade-*` utilities default to `--color-white`, and accept
  `--scroll-fade-color` for another surface.

## Which files Tailwind scans

Tailwind generates a utility only for class names it finds in the scanned files (see
[Tailwind CSS: Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)).
`index.css` limits the scan to `src/` and leaves out stories, tests and Storybook docs pages.

Class names have to appear in full in a scanned file. Tailwind reads files as text and doesn't run
them, so it can't find a class assembled at runtime:

```vue
<!-- Not detected -->
<div :class="`bg-status-${status}`" />

<!-- Detected -->
<div :class="status === 'alert' ? 'bg-status-alert' : 'bg-status-success'" />
```

The same applies to values that arrive as data, such as a padding or alignment chosen in a CMS entry.
Map the value to complete class names in a component, as `src/client/cms/shared/alignment.ts` does.
If you keep components outside `src/`, add their directory with another `@source` line in
`index.css`.
