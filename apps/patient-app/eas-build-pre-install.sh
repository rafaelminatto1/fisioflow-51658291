#!/bin/bash
# Disable Corepack strict mode and upgrade pnpm to project version
export COREPACK_ENABLE_STRICT=0

# Ensure user-level pnpm config disables version auto-management
echo "manage-package-manager-versions=false" >> ~/.npmrc
echo "package-manager-strict=false" >> ~/.npmrc

# Disable corepack for pnpm if corepack is available
corepack disable pnpm 2>/dev/null || true

# Upgrade pnpm to match project's packageManager field (10.33.0)
npm install -g pnpm@10.33.0 2>/dev/null || true

echo "pnpm version: $(pnpm --version 2>/dev/null || echo 'unknown')"
