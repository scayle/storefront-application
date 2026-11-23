#!/usr/bin/env bash
# Syncs CMS schemas and generated types. Read-only against the CMS: every provider
# step exports into the local content model and never writes back, so this is safe
# to run against a hub or space shared with another storefront. The write direction
# is import-cms.sh, which is Amplience-only and destructive.
#
# Storyblok steps follow the current CLI:
# https://www.storyblok.com/docs/libraries/storyblok-cli
#
# Optional: add storyblok.config.ts with defineConfig({ space: ... }) so you can omit --space flags.
#
# Usage: bash ./scripts/sync-cms.sh
# Requires CMS_PROVIDER (storyblok, contentful, contentstack, or amplience) and
# provider-specific env vars (see case blocks).

set -e

source ./scripts/load-cms-env.sh "'storyblok', 'contentful', 'contentstack', or 'amplience'"

case "$CMS_PROVIDER" in
  "storyblok")
    echo "🚀 Syncing Storyblok component schema and generating types..."

    # Bash arrays are whitespace-separated. Commas are not separators: unquoted
    # STORYBLOK_CMS_SPACE, becomes one token and breaks ${!VAR} lookups.
    REQUIRED_STORYBLOK_VARS=(STORYBLOK_CMS_SPACE)
    for VAR in "${REQUIRED_STORYBLOK_VARS[@]}"; do
      if [ -z "${!VAR}" ]; then
        echo "❌ Error: Required variable '$VAR' is not set"
        exit 1
      fi
    done

    if [ -n "$STORYBLOK_CMS_PERSONAL_TOKEN" ]; then
      echo "📝 Logging into Storyblok CLI..."
      REGION="${STORYBLOK_CMS_REGION:-eu}"
      pnpm exec storyblok login --token "$STORYBLOK_CMS_PERSONAL_TOKEN" --region "$REGION"
    else
      echo "ℹ️  STORYBLOK_CMS_PERSONAL_TOKEN not set, using existing Storyblok CLI auth session."
    fi

    echo "📥 Pulling Storyblok components..."
    pnpm exec storyblok components pull --space "$STORYBLOK_CMS_SPACE"

    STORYBLOK_MODEL_DIR="${CONTENT_MODEL_ROOT}/storyblok"
    STORYBLOK_PULL_DIR=".storyblok/components/${STORYBLOK_CMS_SPACE}"
    echo "💾 Persisting Storyblok content model to ${STORYBLOK_MODEL_DIR}..."
    mkdir -p "$STORYBLOK_MODEL_DIR"
    cp "${STORYBLOK_PULL_DIR}/components.json" "$STORYBLOK_MODEL_DIR/"
    cp "${STORYBLOK_PULL_DIR}/groups.json" "$STORYBLOK_MODEL_DIR/"

    echo "🔧 Generating Storyblok TypeScript types..."
    pnpm exec storyblok types generate --space "$STORYBLOK_CMS_SPACE"

    GEN_ROOT="./src/shared/types/cms/storyblok/gen"
    rm -rf "${GEN_ROOT}/components"
    mkdir -p "${GEN_ROOT}"
    cp -r .storyblok/types/. "${GEN_ROOT}/"
    mv "${GEN_ROOT}/${STORYBLOK_CMS_SPACE}" "${GEN_ROOT}/components"

    echo "✅ Storyblok sync completed successfully."
    ;;

  "contentful")
    echo "🚀 Syncing Contentful content model and generating types..."

    REQUIRED_CONTENTFUL_VARS=(CONTENTFUL_CMS_SPACE CONTENTFUL_CMS_MANAGEMENT_TOKEN)
    for VAR in "${REQUIRED_CONTENTFUL_VARS[@]}"; do
      if [ -z "${!VAR}" ]; then
        echo "❌ Error: Required variable '$VAR' is not set"
        exit 1
      fi
    done

    EXPORT_DIR="${CONTENT_MODEL_ROOT}/contentful"
    EXPORT_FILE="contentful.json"
    GEN_OUT="./src/shared/types/cms/contentful/gen"

    # Export content model from Contentful (skips content, roles, webhooks)
    echo "📥 Exporting content model from Contentful..."
    pnpm exec contentful space export \
      --space-id "$CONTENTFUL_CMS_SPACE" \
      --management-token "$CONTENTFUL_CMS_MANAGEMENT_TOKEN" \
      --export-dir "$EXPORT_DIR" \
      --content-file "$EXPORT_FILE" \
      --skip-content --skip-roles --skip-webhooks

    # Generate TypeScript types with type guards from the exported content model
    echo "🔧 Generating Contentful TypeScript types..."
    pnpm exec cf-content-types-generator \
      --response --typeguard --jsdoc \
      "${EXPORT_DIR}/${EXPORT_FILE}" \
      --out "$GEN_OUT"

    # Post-process generated types to fix two issues:
    #
    # 1. Add LocaleCode parameter to single-locale response type aliases.
    #    Without this, types like TypeXxx<"WITHOUT_UNRESOLVABLE_LINKS"> miss the
    #    second generic parameter and default to all locales instead of a single locale.
    #
    # 2. Fix type guard return types. The generated guards use unconstrained generics
    #    (e.g. isTypeFoo<Modifiers extends ChainModifiers>(entry: unknown): entry is TypeFoo<Modifiers, Locales>).
    #    Since the input is `unknown`, TypeScript defaults Modifiers to the full
    #    ChainModifiers union, which makes Contentful's Entry type resolve fields to
    #    a locale-indexed union instead of concrete field values. We replace the
    #    generic signature with a concrete return type predicate that narrows to the
    #    WithoutUnresolvableLinksResponse alias (matching how we call the API with
    #    client.withoutUnresolvableLinks).
    find "$GEN_OUT" -type f -name '*.ts' -print0 \
      | xargs -0 sed -i '' -E \
        -e "s/Type([[:alnum:]]+)<\"WITHOUT_(LINK_RESOLUTION|UNRESOLVABLE_LINKS)\">/Type\\1<\"WITHOUT_\\2\", LocaleCode>/g" \
        -e "s/function isType([[:alnum:]]+)<[^>]+>\(entry: unknown\): entry is Type[[:alnum:]]+<[^>]+>/function isType\1(entry: unknown): entry is Type\1WithoutUnresolvableLinksResponse/g"

    echo "✅ Contentful sync completed successfully."
    ;;

  "contentstack")
    echo "🚀 Syncing Contentstack content types and generating types..."

    # CONTENTSTACK_CMS_REGION is deliberately absent: the runtime reads it with a
    # plain `process.env` lookup and ContentstackCMSService defaults it to `na`,
    # so requiring it here would be stricter than the application itself.
    REQUIRED_CONTENTSTACK_VARS=(
      CONTENTSTACK_CMS_STACK_API_KEY
      CONTENTSTACK_CMS_MANAGEMENT_TOKEN
      CONTENTSTACK_CMS_DELIVERY_TOKEN
      CONTENTSTACK_CMS_ENVIRONMENT
    )
    for VAR in "${REQUIRED_CONTENTSTACK_VARS[@]}"; do
      if [ -z "${!VAR}" ]; then
        echo "❌ Error: Required variable '$VAR' is not set"
        exit 1
      fi
    done

    CONTENTSTACK_MODEL_DIR="${CONTENT_MODEL_ROOT}/contentstack"
    GEN_OUT="./src/shared/types/cms/contentstack/gen/contentstack.d.ts"
    mkdir -p "$(dirname "$GEN_OUT")"

    # Always pass a branch. Without `--branch`, `csdx cm:stacks:export` walks every
    # branch in the stack and writes one directory per branch, including stale test
    # branches, which is both slow and ambiguous about which one to commit.
    CONTENTSTACK_BRANCH="${CONTENTSTACK_CMS_BRANCH:-main}"
    BRANCH_ARGS=(--branch "$CONTENTSTACK_BRANCH")

    # The runtime and the CLI spell regions differently. `CONTENTSTACK_CMS_REGION`
    # holds the lowercase form that @timbenniks/contentstack-endpoints resolves at
    # runtime, while `csdx config:set:region` wants uppercase with hyphens.
    # Normalize the stored value first so the documented aliases (aws-na,
    # AZURE_NA, and so on) all work, defaulting to `na` when unset to match
    # ContentstackCMSService.
    NORMALIZED_REGION=$(echo "${CONTENTSTACK_CMS_REGION:-na}" | tr '[:upper:]_' '[:lower:]-' | sed 's/^aws-//')
    case "$NORMALIZED_REGION" in
      na|us)    CSDX_REGION="AWS-NA" ;;
      eu)       CSDX_REGION="AWS-EU" ;;
      au)       CSDX_REGION="AWS-AU" ;;
      azure-na) CSDX_REGION="AZURE-NA" ;;
      azure-eu) CSDX_REGION="AZURE-EU" ;;
      gcp-na)   CSDX_REGION="GCP-NA" ;;
      gcp-eu)   CSDX_REGION="GCP-EU" ;;
      *)
        echo "❌ Error: CONTENTSTACK_CMS_REGION='$NORMALIZED_REGION' is not supported."
        echo "   Expected one of: na, eu, au, azure-na, azure-eu, gcp-na, gcp-eu"
        echo "   The aliases us, aws-na, aws-eu, and aws-au are also accepted."
        exit 1
        ;;
    esac

    # `csdx tsgen` lives in the contentstack-cli-tsgen oclif plugin, which ships no
    # `bin` and no library entry point, so it cannot be a devDependency. Installing
    # it is idempotent and the only supported way to run type generation.
    echo "📦 Installing Contentstack CLI type generation plugin..."
    pnpm exec csdx plugins:install contentstack-cli-tsgen@5.0.0

    echo "📝 Configuring Contentstack CLI region ($CSDX_REGION)..."
    pnpm exec csdx config:set:region "$CSDX_REGION"

    echo "🔑 Registering Contentstack management token..."
    pnpm exec csdx auth:tokens:add --management --alias sync-mgmt-token \
      --stack-api-key "$CONTENTSTACK_CMS_STACK_API_KEY" \
      --token "$CONTENTSTACK_CMS_MANAGEMENT_TOKEN" --yes

    echo "🔑 Registering Contentstack delivery token..."
    pnpm exec csdx auth:tokens:add --delivery --alias sync-token \
      --stack-api-key "$CONTENTSTACK_CMS_STACK_API_KEY" \
      --token "$CONTENTSTACK_CMS_DELIVERY_TOKEN" \
      --environment "$CONTENTSTACK_CMS_ENVIRONMENT" --yes

    # `csdx cm:stacks:export` clears the target directory first, so exporting a
    # second module destroys the first one's output. Each module therefore
    # exports into its own staging directory.
    #
    # Everything is staged and validated before anything replaces the committed
    # model, so a failure part-way through (for example a branch that has content
    # types but no labels) leaves the existing model untouched rather than a
    # half-updated mix of two branches.
    #
    # The Storefront CLI import reads <model>/content_types/*.json and
    # <model>/labels/labels.json with no branch segment. Contentstack CLI 2.x
    # exports flat (verified 2026-08-18 against a real stack: content types and
    # labels land directly under the data-dir with no branch segment), so no
    # unnesting is needed here anymore.
    CONTENTSTACK_STAGING_DIR="${CONTENTSTACK_MODEL_DIR}.staging"
    rm -rf "$CONTENTSTACK_STAGING_DIR"
    mkdir -p "$CONTENTSTACK_STAGING_DIR"

    stage_contentstack_module() {
      local module="$1"
      local target="$2"
      local scratch="${CONTENTSTACK_STAGING_DIR}/.export-${module}"

      pnpm exec csdx cm:stacks:export \
        --stack-api-key "$CONTENTSTACK_CMS_STACK_API_KEY" \
        --data-dir "$scratch" \
        --alias sync-mgmt-token \
        --module "$module" \
        --yes \
        "${BRANCH_ARGS[@]}"

      if [ ! -d "${scratch}/${target}" ]; then
        echo "❌ Error: branch '${CONTENTSTACK_BRANCH}' produced no '${module}' export."
        echo "   Expected ${scratch}/${target}, found:"
        ls -1R "$scratch" 2>/dev/null | head -30
        echo "   Check that CONTENTSTACK_CMS_BRANCH names a branch that has this module."
        echo "   The existing content model was left untouched."
        exit 1
      fi

      mv "${scratch}/${target}" "${CONTENTSTACK_STAGING_DIR}/"
      rm -rf "$scratch"
    }

    echo "📥 Exporting Contentstack content types..."
    stage_contentstack_module content-types content_types

    # `csdx` also writes a `schema.json` index listing every content type. The
    # Storefront CLI import treats each file in content_types/ as one content type,
    # and reads `.schema` off it, so the index would throw on the first file. Drop
    # it; the per-type files are the content model.
    rm -f "${CONTENTSTACK_STAGING_DIR}/content_types/schema.json"

    echo "📥 Exporting Contentstack labels..."
    stage_contentstack_module labels labels

    if [ -z "$(ls -A "${CONTENTSTACK_STAGING_DIR}/content_types" 2>/dev/null)" ]; then
      echo "❌ Error: branch '${CONTENTSTACK_BRANCH}' exported no content types."
      echo "   The existing content model was left untouched."
      exit 1
    fi

    if [ ! -f "${CONTENTSTACK_STAGING_DIR}/labels/labels.json" ]; then
      echo "❌ Error: branch '${CONTENTSTACK_BRANCH}' exported no labels/labels.json."
      echo "   The existing content model was left untouched."
      exit 1
    fi

    # Both modules staged and valid: swap them in as one step.
    echo "📦 Updating content model from branch '${CONTENTSTACK_BRANCH}'..."
    rm -rf "${CONTENTSTACK_MODEL_DIR:?}"
    mv "$CONTENTSTACK_STAGING_DIR" "$CONTENTSTACK_MODEL_DIR"

    echo "🔧 Generating Contentstack TypeScript types..."
    pnpm exec csdx tsgen --alias sync-token --branch "$CONTENTSTACK_BRANCH" \
      --output "$GEN_OUT" --include-system-fields

    echo "✅ Contentstack sync completed successfully."
    ;;

  "amplience")
    echo "🚀 Syncing Amplience content model and generating types..."

    REQUIRED_AMPLIENCE_VARS=(
      AMPLIENCE_CMS_HUB_ID
      AMPLIENCE_CMS_PERSONAL_ACCESS_TOKEN
    )
    for VAR in "${REQUIRED_AMPLIENCE_VARS[@]}"; do
      if [ -z "${!VAR}" ]; then
        echo "❌ Error: Required variable '$VAR' is not set"
        exit 1
      fi
    done

    AMPLIENCE_MODEL_DIR="${CONTENT_MODEL_ROOT}/amplience"

    echo "📝 Configuring dc-cli..."
    pnpm exec dc-cli configure \
      --patToken "$AMPLIENCE_CMS_PERSONAL_ACCESS_TOKEN" \
      --hubId "$AMPLIENCE_CMS_HUB_ID"

    echo "📥 Exporting content type schemas..."
    pnpm exec dc-cli content-type-schema export "${AMPLIENCE_MODEL_DIR}/schemas/"

    echo "📥 Exporting content types..."
    pnpm exec dc-cli content-type export "${AMPLIENCE_MODEL_DIR}/content-types/"

    echo "🔧 Generating Amplience TypeScript types..."
    node ./scripts/generate-amplience-types.mjs

    echo "✅ Amplience sync completed successfully."
    ;;

  *)
    echo "ℹ️  No sync workflow configured for CMS_PROVIDER='$CMS_PROVIDER'."
    ;;
esac

echo "🎉 CMS sync process completed."
