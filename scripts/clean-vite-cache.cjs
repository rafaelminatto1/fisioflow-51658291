#!/usr/bin/env node

/**
 * Script de Limpeza Completa do Cache do Vite
 *
 * Remove todos os caches e artefatos de build do Vite.
 * Útil para resolver problemas de "Outdated Optimize Dep" e outros erros de cache.
 *
 * Uso: node scripts/clean-vite-cache.js
 *      pnpm run clean:vite
 */

const fs = require('fs');
const path = require('path');

// Diretórios e arquivos para limpar
const itemsToClean = [
  'node_modules/.vite',
  '.vite',
  'dist',
  'node_modules/.cache',
];

/**
 * Remove um diretório ou arquivo recursivamente
 * @param {string} itemPath - Caminho do item a ser removido
 * @returns {boolean} True se removido com sucesso, false caso contrário
 */
function removeItem(itemPath) {
  try {
    if (fs.existsSync(itemPath)) {
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(itemPath);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error(`  ❌ Erro ao remover ${itemPath}:`, error.message);
    return false;
  }
}

/**
 * Função principal de limpeza
 */
function cleanAll() {
  console.log('🧹 Limpando caches do Vite...\n');

  let removedCount = 0;
  let notFoundCount = 0;

  itemsToClean.forEach(item => {
    const fullPath = path.join(process.cwd(), item);

    if (removeItem(fullPath)) {
      console.log(`  ✅ Removido: ${item}`);
      removedCount++;
    } else {
      console.log(`  ℹ️  Não encontrado: ${item}`);
      notFoundCount++;
    }
  });

  console.log('');
  console.log('📊 Resumo:');
  console.log(`  ✅ Removidos: ${removedCount}`);
  console.log(`  ℹ️  Não encontrados: ${notFoundCount}`);
  console.log('\n✅ Limpeza concluída!\n');

  if (removedCount > 0) {
    console.log('💡 Dica: Execute "pnpm run dev" para iniciar o servidor com cache limpo.');
  }
}

// Executar limpeza
cleanAll();
