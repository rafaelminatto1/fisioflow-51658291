#!/usr/bin/env node

// Hook para ajudar o EAS a instalar dependências em monorepo com pnpm
const fs = require('fs');
const path = require('path');

console.log('Running post-install hook for EAS build...');

// Criar link simbólico ou copiar node_modules do monorepo se necessário
const workspaceRoot = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(workspaceRoot, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('Node modules not found, this might be an issue with EAS build.');
  // Tente criar uma estrutura básica
  fs.mkdirSync(nodeModulesPath, { recursive: true });
  console.log('Created node_modules directory');
} else {
  console.log('node_modules exists, skipping setup');
}

console.log('Post-install hook completed successfully');
