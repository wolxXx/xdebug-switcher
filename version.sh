#!/bin/bash

# Read current version from package.json
CURRENT_VERSION=$(jq -r '.version' package.json)

echo "Current version: $CURRENT_VERSION"
read -p "Enter new version [Minor increase]: " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    # Increase minor version by one (e.g., 1.2.3 -> 1.3.0)
    IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
    minor=$((minor + 1))
    NEW_VERSION="$major.$minor.0"
fi

echo "Setting version to: $NEW_VERSION"

# Update files
files=("package.json" "bower.json" "composer.json")

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        # Use jq to update the version field
        tmp=$(mktemp)
        jq --arg ver "$NEW_VERSION" '.version = $ver' "$file" > "$tmp" && mv "$tmp" "$file"
        echo "$file updated."
    else
        echo "Warning: $file not found."
    fi
done
