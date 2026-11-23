---
name: translate-locales
description: Translate storefront i18n keys into all locale files using parallel subagents with e-commerce context. Use after adding, changing, or removing translation keys in src/i18n/locales/en_GB.json, when locale files are missing keys or out of sync, or when asked to "translate the new keys", "sync locale files", or "backfill translations".
license: MIT
metadata:
  author: scayle
  version: '1.1'
---

# Translate locales

`src/i18n/locales/en_GB.json` is the source of truth for translation keys.
This skill propagates key additions, changes, and removals from `en_GB.json`
to every other locale file — one translation subagent per locale — so the
ESLint rule `@intlify/vue-i18n/no-missing-keys-in-other-locales` (error in
CI, warn locally) stays green.

Run all commands from the application root (the directory containing
`src/i18n/locales/`).

## When to run

- Immediately after adding, changing, or removing keys in `en_GB.json`, in the
  same session.
- On request, to backfill locale files that are missing keys.

## Workflow

### 1. Determine the key set

**Normal mode** (keys were just edited): collect the changed keys from the
session context or from git:

```bash
git diff HEAD -- src/i18n/locales/en_GB.json
git diff origin/main...HEAD -- src/i18n/locales/en_GB.json
```

If your default branch is not `main`, adjust the ref accordingly.

Classify every affected key as **added**, **changed** (English value edited),
or **removed**.

**Backfill mode** (no pending en_GB diff): compute the key parity report and
treat every key listed as `missing` as **added** for that locale, and every
key listed as `extra` as **removed** for that locale:

```bash
node -e '
const fs = require("fs");
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) =>
  typeof v === "object" && v !== null ? flat(v, p + k + ".") : [p + k]);
const base = new Set(flat(JSON.parse(fs.readFileSync("src/i18n/locales/en_GB.json", "utf8"))));
for (const f of fs.readdirSync("src/i18n/locales").sort()) {
  if (f === "en_GB.json") continue;
  const keys = new Set(flat(JSON.parse(fs.readFileSync("src/i18n/locales/" + f, "utf8"))));
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length || extra.length) console.log(f, JSON.stringify({ missing, extra }));
}'
```

No output means every locale is in sync — stop here in backfill mode.

### 2. Enumerate target locales

Every `src/i18n/locales/*.json` except `en_GB.json`. Never hardcode a locale
list — projects add and remove locales.

### 3. Dispatch one subagent per locale, in parallel

Dispatch ALL locales in a single message (one Agent tool call per locale,
`subagent_type: general-purpose`, `model: sonnet`) so they run concurrently.
Use Sonnet 5 (`model: sonnet`): these are short, well-specified edits, so the
cheaper model is the right fit and keeps a full-locale-set run affordable.
Each subagent edits only its own file, so parallel writes cannot conflict.

Keep each subagent's prompt token-efficient. The dominant cost is file reads,
so:

- Inline every source value AND its insertion position (from the diff or
  parity report you already computed) directly in the prompt. The subagent
  must NOT read `en_GB.json` — you have already read it, and re-reading a
  ~25 KB file in every subagent is the largest avoidable cost.
- Limit reads to exactly two files: the translation-context reference and the
  subagent's own locale file.
- Ask for a brief reply (keys touched + ambiguities only), not a narrative.

Use this prompt template, filling `{locale_code}` (e.g. `de_DE`) and the key
list:

```text
Translate UI strings for a fashion e-commerce storefront into the locale
{locale_code}.

Read ONLY these two files (do NOT read en_GB.json — all source values and
positions you need are inline below; reading extra files wastes tokens):
1. .claude/skills/translate-locales/references/translation-context.md —
   domain, tone, glossary, and syntax rules. Follow it exactly.
2. src/i18n/locales/{locale_code}.json — the file you will edit. Match its
   existing terminology, phrasing, and formality register. The existing file
   is authoritative when it conflicts with general conventions.

Then apply the following key changes to src/i18n/locales/{locale_code}.json.
English source values are quoted directly from en_GB.json; positions describe
where the key sits in en_GB.json:

- added: `example.headline` — "Don't miss out" (first key of `example`)
- changed: `example.subline` — "See your final price in the basket."
- removed: `example.old_key`

Editing rules:
- Added keys: insert the translated value at the same position as in
  en_GB.json (same parent object, same relative order within it), as described
  per key above.
- Changed keys: replace the existing translation with a translation of the
  updated English value.
- Removed keys: delete the key, and its parent object if it becomes empty.
- Keep `{placeholder}` names byte-identical — never translate or rename them.
- Keep the same number of `|`-separated plural branches as the source.
- Do not modify any key not listed above. Do not reformat the file.
- The file must remain valid JSON.
- For en_US only: adapt the en_GB source to American English (spelling and
  vocabulary) instead of translating, following the existing en_US.json
  precedent for each term.

When done, reply briefly with the list of keys you added, changed, and
removed, plus any source strings that were ambiguous.
```

### 4. Verify

1. Re-run the key parity report from step 1 (backfill mode command). Expected:
   no output.
2. `CI=true pnpm exec eslint src/i18n/locales/` — activates
   `no-missing-keys-in-other-locales` alongside `valid-message-syntax` and
   `no-duplicate-keys-in-locale`. Expected: exit 0.
3. `pnpm format:fix` (or `pnpm exec prettier --write src/i18n/locales/`).
4. If a locale failed or its subagent died: re-dispatch that single locale
   once. If it fails again, report the failing locale and keys to the user —
   do not silently continue.

## Rules

- This skill NEVER modifies `en_GB.json`. Author English changes first, then
  run the skill.
- Subagents touch only the keys listed in their prompt; unrelated keys and
  formatting stay untouched.
- Translation quality guidance (tone, glossary, register) lives in
  `references/translation-context.md` — edit that file, not this workflow, to
  change brand voice.
