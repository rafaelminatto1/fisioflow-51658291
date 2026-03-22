#!/bin/bash
set -e

echo "Installing dependencies with pnpm..."

# Instalar pnpm globalmente se necessário
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi

# Instalar dependências do monorepo
pnpm install --frozen-lockfile

echo "Dependencies installed successfully!"
