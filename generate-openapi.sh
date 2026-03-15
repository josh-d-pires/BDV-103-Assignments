#!/bin/bash

# Generate tsoa spec and routes
npx tsoa spec-and-routes

# Generate TypeScript client SDK from OpenAPI spec (requires Java)
# This will only work in the devcontainer where Java is installed
if which java > /dev/null 2>&1; then
  npx @openapitools/openapi-generator-cli generate -i ./build/swagger.json -o ./client -g typescript-fetch
else
  echo "Java not found - skipping client SDK generation (will work in devcontainer)"
fi
