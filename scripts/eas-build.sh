#!/bin/bash

# Wrapper around `eas build` that prompts for version bump before building.
# Usage: ./scripts/eas-build.sh [any eas build args]
# Example: ./scripts/eas-build.sh --platform ios --profile production

APP_JSON="$(dirname "$0")/../app.json"
CURRENT_VERSION=$(node -e "console.log(require('$APP_JSON').expo.version)")

echo ""
echo "Current app version: $CURRENT_VERSION"
echo ""
echo "Do you want to bump the version before building?"
echo "  1) No, keep $CURRENT_VERSION"
echo "  2) Patch (e.g. 1.0.3 → 1.0.4)"
echo "  3) Minor (e.g. 1.0.3 → 1.1.0)"
echo "  4) Major (e.g. 1.0.3 → 2.0.0)"
echo ""
read -p "Choose [1-4]: " choice

case $choice in
  2)
    NEW_VERSION=$(node -e "
      const v = '$CURRENT_VERSION'.split('.');
      v[2] = parseInt(v[2]) + 1;
      console.log(v.join('.'));
    ")
    ;;
  3)
    NEW_VERSION=$(node -e "
      const v = '$CURRENT_VERSION'.split('.');
      v[1] = parseInt(v[1]) + 1;
      v[2] = 0;
      console.log(v.join('.'));
    ")
    ;;
  4)
    NEW_VERSION=$(node -e "
      const v = '$CURRENT_VERSION'.split('.');
      v[0] = parseInt(v[0]) + 1;
      v[1] = 0;
      v[2] = 0;
      console.log(v.join('.'));
    ")
    ;;
  *)
    echo "Keeping version $CURRENT_VERSION"
    echo ""
    exec eas build "$@"
    ;;
esac

# Update app.json with new version
node -e "
  const fs = require('fs');
  const path = require('path');
  const appJsonPath = path.resolve('$APP_JSON');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  appJson.expo.version = '$NEW_VERSION';
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
"

echo "Version bumped: $CURRENT_VERSION → $NEW_VERSION"
echo ""

exec eas build "$@"
