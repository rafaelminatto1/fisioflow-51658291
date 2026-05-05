#!/bin/bash
set -e

echo "=== EAS Pre-Install Hook ==="
echo "PWD: $(pwd)"
echo "Node: $(node --version)"
echo "pnpm (current): $(pnpm --version 2>/dev/null || echo 'not found')"

# Força pnpm 10.33.0 para compatibilidade com lockfile do monorepo
echo "Upgrading pnpm to 10.33.0..."
npm install -g pnpm@10.33.0 --silent 2>&1 || true

echo "pnpm (after upgrade): $(pnpm --version 2>/dev/null || echo 'not found')"
echo "==========================="
