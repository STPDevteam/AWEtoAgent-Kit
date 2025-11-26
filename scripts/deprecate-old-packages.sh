#!/bin/bash
# Run this after publishing new @AWEtoAgent packages with simplified names
# Requires npm publish permissions

set -e

echo "Deprecating old package names..."

npm deprecate @AWEtoAgent/agent-kit "Package renamed to @AWEtoAgent/core. Please migrate to the new package name."
npm deprecate @AWEtoAgent/agent-kit-identity "Package renamed to @AWEtoAgent/identity. Please migrate to the new package name."
npm deprecate @AWEtoAgent/agent-kit-payments "Package renamed to @AWEtoAgent/payments. Please migrate to the new package name."
npm deprecate @AWEtoAgent/agent-kit-hono "Package renamed to @AWEtoAgent/hono. Please migrate to the new package name."
npm deprecate @AWEtoAgent/agent-kit-tanstack "Package renamed to @AWEtoAgent/tanstack. Please migrate to the new package name."
npm deprecate @AWEtoAgent/create-agent-kit "Package renamed to @AWEtoAgent/cli. Please migrate to the new package name."

echo "✓ All old packages deprecated successfully"
echo ""
echo "Users will now see deprecation warnings when installing old package names."

