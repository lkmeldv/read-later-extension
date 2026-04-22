#!/bin/bash
# Usage: ./scripts/bump-version.sh [major|minor|patch]
# Bumps the version in manifest.json

TYPE=${1:-patch}
CURRENT=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case $TYPE in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [major|minor|patch]"; exit 1 ;;
esac

NEW="${MAJOR}.${MINOR}.${PATCH}"

sed -i '' "s/\"version\": \"${CURRENT}\"/\"version\": \"${NEW}\"/" manifest.json

echo "Version: ${CURRENT} -> ${NEW}"
