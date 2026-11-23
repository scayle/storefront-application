# Translation context

E-commerce translation brief for storefront UI strings. The `translate-locales`
skill includes this file in every translation subagent prompt.

**Tenants:** adapt this file to your brand voice. The glossary, tone, and
register below are the defaults for the SCAYLE Storefront boilerplate.

## Domain

Customer-facing UI copy for a fashion/lifestyle e-commerce storefront built on
the SCAYLE Commerce Engine: product listing and detail pages, basket, wishlist,
checkout, sign-in and account, promotions, and order flows.

## Tone of voice

- Concise, friendly, and direct; address the customer personally.
- Calls to action are imperative and action-oriented ("Add to basket",
  "Continue shopping").
- Promotional strings keep the energy of the source ("Don't Miss Your Deal!")
  without exaggerating it.
- No bureaucratic or legalistic phrasing unless the source string is legal
  text.

## Register and formality

- The existing locale file is always authoritative: match the register already
  used there.
- Default when a locale has no precedent: informal, where the language
  distinguishes. Established precedent: `de_DE.json` uses "du" exclusively,
  never "Sie".

## Glossary

Translate these consistently. When the target locale file already translates a
term, reuse that translation:

| en_GB term          | Meaning                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| basket              | The shopping basket (page and concept)                                              |
| wishlist            | Saved-for-later product list                                                        |
| checkout            | The purchase flow after the basket                                                  |
| voucher             | A redeemable discount code                                                          |
| promotion           | A rule-based discount mechanic (e.g. buy X get Y, minimum order value)              |
| campaign            | A time-limited, shop-wide marketing event with reduced prices                       |
| deal / sale         | Consumer-facing discount labels: "deal" for promotions, "sale" for price reductions |
| order               | A placed purchase                                                                   |
| return              | Sending items back                                                                  |
| delivery / shipping | Getting the parcel to the customer                                                  |

`en_US` is not translated but adapted: American spelling and vocabulary,
following the existing `en_US.json` precedent for each term.

`de_AT` takes the `de_DE.json` translation of the same key, and departs from
it only where Austrian German uses another word.

## vue-i18n message syntax

- `{name}` placeholders stay byte-identical — never translate or rename
  `{amount}`, `{count}`, `{name}`. They may be repositioned to fit the
  sentence.
- Plural branches are separated by `|` and selected positionally
  (`$t('key', count)`). Keep exactly the same number of branches as the
  English source.
- Messages live in JSON: escape double quotes, no trailing commas.
- The characters `@` and `|` are special in vue-i18n message format — copy the
  source's escaping style.

## Length and UI constraints

- Stay close to the length of the English source; verbose translations break
  layouts.
- Buttons, tabs, and labels stay short (one to three words).

## Accessibility strings

Keys under an `a11y` object are screen-reader announcements: plain, literal,
descriptive. No marketing tone, no exclamation marks.
