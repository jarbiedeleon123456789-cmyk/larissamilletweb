#!/bin/sh
# Render static-site build: copies the site to dist/ and writes config.js from API_URL.
set -e
rm -rf dist && mkdir dist
cp -r index.html assets dist/
cp config.js dist/config.js
if [ -n "$API_URL" ]; then
  API_URL_CLEAN=$(printf '%s' "$API_URL" | sed 's#/*$##')
  sed -i "s#apiUrl: \"[^\"]*\"#apiUrl: \"${API_URL_CLEAN}\"#" dist/config.js
fi
echo "Built dist/ with API: $(grep apiUrl dist/config.js)"
