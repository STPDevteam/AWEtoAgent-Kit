#!/bin/bash
# Run this after publishing new @awe-agents packages with simplified names
# Requires npm publish permissions

set -e

echo "Deprecating old package names..."

npm deprecate @awe-agents/agent-kit "Package renamed to @awe-agents/core. Please migrate to the new package name."
npm deprecate @awe-agents/agent-kit-identity "Package renamed to @awe-agents/identity. Please migrate to the new package name."
npm deprecate @awe-agents/agent-kit-payments "Package renamed to @awe-agents/payments. Please migrate to the new package name."
npm deprecate @awe-agents/agent-kit-hono "Package renamed to @awe-agents/hono. Please migrate to the new package name."
npm deprecate @awe-agents/agent-kit-tanstack "Package renamed to @awe-agents/tanstack. Please migrate to the new package name."
npm deprecate @awe-agents/create-agent-kit "Package renamed to @awe-agents/cli. Please migrate to the new package name."

echo "✓ All old packages deprecated successfully"
echo ""
echo "Users will now see deprecation warnings when installing old package names."

