#!/usr/bin/env node

// Script pós-instalação para EAS Build
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Running EAS post-install setup...');

try {
  // Verificar se pnpm está instalado
  console.log('Checking for pnpm...');
  try {
    execSync('which pnpm || npm install -g pnpm', { stdio: 'inherit' });
    console.log('✅ pnpm is available');
  } catch (error) {
    console.log('⚠️ Could not ensure pnpm availability');
  }

  // Instalar dependências se node_modules não existir
  const appDir = path.join(__dirname, '..', 'professional-app');
  const nodeModulesDir = path.join(appDir, '..', 'node_modules');

  if (!fs.existsSync(nodeModulesDir)) {
    console.log('📦 Installing dependencies with pnpm...');
    execSync('pnpm install --frozen-lockfile', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log('✅ Dependencies installed');
  } else {
    console.log('✅ Dependencies already installed');
  }

  console.log('🎉 EAS post-install setup completed!');
} catch (error) {
  console.error('❌ EAS post-install setup failed:', error.message);
  // Não falhar o build se o pós-instalação falhar
  process.exit(0);
}
