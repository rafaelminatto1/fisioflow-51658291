#!/bin/bash
# Upgrade pnpm to match project's packageManager field (10.33.0)
# EAS installs pnpm@10.14.0 by default; this upgrades it before install
npm install -g pnpm@10.33.0 2>/dev/null || true
echo "pnpm version after upgrade: $(pnpm --version 2>/dev/null || echo 'unknown')"
