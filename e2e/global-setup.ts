/**
 * Global Setup for Playwright E2E Tests
 *
 * Executa antes de todos os testes para preparar o ambiente:
 * 1. Executa seed data se E2E_AUTO_SEED=true
 * 2. Limpa dados de teste anteriores se E2E_CLEANUP=true
 *
 * Uso:
 *   E2E_AUTO_SEED=true npm run test:e2e
 */

import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEED_SCRIPT = path.join(__dirname, '../scripts/seed-e2e-data.cjs');

export default async function globalSetup(config: FullConfig) {
  console.log('\n🧪 Playwright Global Setup - Iniciando...');

  // Verifica se deve executar seed data automaticamente
  const autoSeed = process.env.E2E_AUTO_SEED === 'true';
  const cleanup = process.env.E2E_CLEANUP === 'true';

  if (autoSeed) {
    console.log('📱 Executando seed data automaticamente...');

    try {
      // Executa o script de seed data
      execSync(`node "${SEED_SCRIPT}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        timeout: 60000, // 60 segundos
      });

      console.log('✅ Seed data executado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao executar seed data:', error);
      // Não falhar os testes se seed data falhar
      console.log('⚠️  Continuando testes sem seed data...');
    }
  } else {
    console.log('ℹ️  Seed data automática desativada');
    console.log('   Para ativar: E2E_AUTO_SEED=true npm run test:e2e');
    console.log('   Ou execute manualmente: npm run db:seed:e2e');
  }

  if (cleanup) {
    console.log('🧹 Limpeza de dados de teste não implementada (use Firebase Console manualmente)');
  }

  console.log('✅ Global Setup concluído\n');
}
