#!/usr/bin/env bash
# Imports the local CMS content model into the configured CMS hub. This is the
# counterpart to sync-cms.sh, which exports the hub into the local content model.
#
# This WRITES to the hub and does not merge. `dc-cli content-type import` replaces
# each type's `settings` (label, icons, visualizations) and `repositories` with the
# committed file, and `dc-cli content-type-schema import` rewrites the `items.oneOf`
# of every parent schema that can hold a changed block. Anything configured only in
# the Dynamic Content UI is lost.
#
# Read "Import into an existing hub" in docs/cms/AMPLIENCE.md before running it
# against a hub anyone else uses.
#
# Usage: bash ./scripts/import-cms.sh
# Requires CMS_PROVIDER=amplience, AMPLIENCE_CMS_HUB_ID and AMPLIENCE_CMS_PERSONAL_ACCESS_TOKEN.

set -e

source ./scripts/load-cms-env.sh "'amplience'"

if [ "$CMS_PROVIDER" != "amplience" ]; then
  # Only Amplience ships an import step. The other provider CLIs have no comparable
  # push command, so a fork's model reaches their hubs through their own tooling.
  echo "❌ Error: cms:import supports CMS_PROVIDER='amplience' only, got '$CMS_PROVIDER'."
  exit 1
fi

echo "🚀 Importing Amplience content model into the hub..."

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

echo "⚠️  This replaces content-type settings, repositories and parent schemas on hub '${AMPLIENCE_CMS_HUB_ID}'."
echo "⚠️  Nothing is merged. See docs/cms/AMPLIENCE.md > Import into an existing hub."

AMPLIENCE_MODEL_DIR="${CONTENT_MODEL_ROOT}/amplience"
SCHEMAS_DIR="${AMPLIENCE_MODEL_DIR}/schemas"
CONTENT_TYPES_DIR="${AMPLIENCE_MODEL_DIR}/content-types"

for DIR in "$SCHEMAS_DIR" "$CONTENT_TYPES_DIR"; do
  if [ ! -d "$DIR" ]; then
    echo "❌ Error: Content model directory not found at $DIR"
    exit 1
  fi
done

echo "📝 Configuring dc-cli..."
pnpm exec dc-cli configure \
  --patToken "$AMPLIENCE_CMS_PERSONAL_ACCESS_TOKEN" \
  --hubId "$AMPLIENCE_CMS_HUB_ID"

echo "📤 Importing content type schemas from ${SCHEMAS_DIR}..."
pnpm exec dc-cli content-type-schema import "$SCHEMAS_DIR"

echo "📤 Importing content types from ${CONTENT_TYPES_DIR}..."
pnpm exec dc-cli content-type import "$CONTENT_TYPES_DIR"

echo "✅ Amplience import completed successfully."
