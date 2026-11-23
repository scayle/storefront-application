#!/usr/bin/env bash
# Shared prelude for the CMS scripts: loads .env, requires CMS_PROVIDER, and defines
# CONTENT_MODEL_ROOT. Sourced by sync-cms.sh and import-cms.sh, so a fix to the parsing
# below lands in both.
#
# Usage: source ./scripts/load-cms-env.sh "<comma-separated list of valid providers>"

VALID_PROVIDERS="${1:-storyblok, contentful, contentstack, or amplience}"

# Load environment variables from .env file if it exists
# This approach safely handles:
# - Empty lines
# - Comment lines (lines starting with #)
# - Inline comments (e.g., KEY=value # comment)
# - Values with quotes (e.g., KEY='value' or KEY="value")
# - Values with special characters or spaces
if [ -f ".env" ]; then
    echo "📄 Loading environment variables from .env file..."
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comment-only lines
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

        # Remove inline comments (everything after # on the line)
        line=$(echo "$line" | sed 's/#.*$//')

        # Remove surrounding quotes from values (both single and double quotes)
        # Pattern 1: Remove quotes after = sign (handles KEY='value' -> KEY=value)
        # Pattern 2: Remove trailing quotes and whitespace
        # Use [[:space:]]* not \s*: BSD sed treats \s as literal "s", which strips
        # the first "s" from values like storyblok.
        line=$(echo "$line" | sed "s/=[[:space:]]*['\"]*/=/;s/['\"]*[[:space:]]*$//")

        # Export the cleaned variable, unless the caller already set it. An explicit
        # `CMS_PROVIDER=amplience pnpm cms:import` has to win over the .env value,
        # otherwise the command in front of the script silently does nothing.
        key="${line%%=*}"
        key="${key//[[:space:]]/}"
        [ -z "$key" ] && continue
        [ -n "${!key+set}" ] && continue

        export "$line"
    done < .env
fi

if [ -z "$CMS_PROVIDER" ]; then
    echo "Error: CMS_PROVIDER environment variable is not set"
    echo "Please set CMS_PROVIDER to ${VALID_PROVIDERS}"
    exit 1
fi

CONTENT_MODEL_ROOT="./.scayle/cms/contentModel"
