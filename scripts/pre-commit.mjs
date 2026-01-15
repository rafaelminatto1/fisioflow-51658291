#!/usr/bin/env node

/**
 * Git Pre-Commit Hook
 *
 * Executa verificações antes de permitir um commit.
 *
 * Para instalar: node scripts/pre-commit.mjs --install
 * Para desinstalar: node scripts/pre-commit.mjs --uninstall
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const hookPath = join(rootDir, '.git', 'hooks', 'pre-commit');
const hookSourcePath = join(__dirname, 'pre-commit.mjs');

const args = process.argv.slice(2);

// Instalar hook
if (args.includes('--install')) {
  try {
    const hookContent = `#!/bin/sh
node "${join(rootDir, 'scripts', 'pre-commit.mjs')}"
`;
    writeFileSync(hookPath, hookContent, { mode: 0o755 });
    console.log('✅ Pre-commit hook instalado com sucesso!');
    console.log('   O hook será executado automaticamente antes de cada commit.');
  } catch (err) {
    console.error('❌ Erro ao instalar hook:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

// Desinstalar hook
if (args.includes('--uninstall')) {
  try {
    if (existsSync(hookPath)) {
      unlinkSync(hookPath);
      console.log('✅ Pre-commit hook removido.');
    } else {
      console.log('⚠️  Nenhum pre-commit hook encontrado.');
    }
  } catch (err) {
    console.error('❌ Erro ao remover hook:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

// Executar verificações
console.log('🔍 Pre-commit checks...\n');

const checks = [
  {
    name: 'Lint',
    cmd: 'npm run lint',
    critical: true
  },
  {
    name: 'TypeScript',
    cmd: 'npx tsc --noEmit',
    critical: true
  }
];

// Adicionar testes de race condition se houver conexão com banco
const skipRaceTest = process.env.SKIP_RACE_CONDITION_TEST === 'true';
if (!skipRaceTest) {
  checks.push({
    name: 'Race Conditions',
    cmd: 'node test-race-condition.mjs 20',
    critical: false,
    continueOnFail: true // Não bloquear commit se falhar (pode não ter DB)
  });
}

let failedCritical = false;
let failedOptional = [];

for (const check of checks) {
  process.stdout.write(`   ${check.name}... `);

  try {
    execSync(check.cmd, {
      cwd: rootDir,
      stdio: 'pipe',
      timeout: 60000
    });
    console.log('✅');
  } catch (err) {
    console.log(check.critical ? '❌' : '⚠️ ');

    if (check.critical) {
      failedCritical = true;
      console.log(`   Erro: ${err.message?.split('\n')[0] || 'Unknown error'}`);
    } else {
      failedOptional.push(check.name);
    }
  }
}

console.log('');

// Resumo
if (failedOptional.length > 0) {
  console.log('⚠️  Alguns checks opcionais falharam:');
  failedOptional.forEach(name => {
    console.log(`   - ${name} (pode ser ignorado se não houver conexão com DB)`);
  });
  console.log('');
}

if (failedCritical) {
  console.log('❌ Commit abortado! Corrija os erros acima antes de commitar.\n');
  console.log('💡 Dica: Use --no-verify para pular o hook (não recomendado)');
  console.log('   Exemplo: git commit --no-verify -m "message"\n');
  process.exit(1);
}

console.log('✅ Todos os checks críticos passaram! Commit permitido.\n');
