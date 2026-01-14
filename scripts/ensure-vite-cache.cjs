#!/usr/bin/env node

/**
 * Script de Verificação de Cache do Vite
 *
 * Verifica se o cache do Vite está válido e limpa se necessário.
 * Executado automaticamente pelo script predev antes de iniciar o servidor.
 *
 * Critérios de validade:
 * - Cache existe e tem metadados válidos
 * - Cache tem menos de 24 horas
 * - package.json não foi modificado desde a criação do cache
 */

const fs = require('fs');
const path = require('path');

const viteCacheDir = path.join(process.cwd(), 'node_modules', '.vite');
const cacheMetaFile = path.join(viteCacheDir, '_metadata.json');
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 horas em ms

/**
 * Verifica se o cache do Vite é válido
 * @returns {boolean} True se o cache é válido, false caso contrário
 */
function checkCacheValidity() {
  // Verificar se o diretório de cache existe
  if (!fs.existsSync(viteCacheDir)) {
    return false;
  }

  // Verificar se o arquivo de metadados existe
  if (!fs.existsSync(cacheMetaFile)) {
    return false;
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(cacheMetaFile, 'utf-8'));
    const now = Date.now();

    // Verificar idade do cache
    const cacheTimestamp = metadata.timestamp || metadata.builtAt || 0;
    const cacheAge = now - cacheTimestamp;

    if (cacheAge > MAX_CACHE_AGE) {
      console.log('⚠️  Cache do Vite expirado (>24h)');
      return false;
    }

    // Verificar se package.json foi modificado
    try {
      const packageStat = fs.statSync('package.json');
      const packageMtime = packageStat.mtime.getTime();

      if (metadata.packageMtime && metadata.packageMtime !== packageMtime) {
        console.log('⚠️  package.json modificado desde a criação do cache');
        return false;
      }

      // Atualizar timestamp do package.json nos metadados para futuras verificações
      if (!metadata.packageMtime) {
        metadata.packageMtime = packageMtime;
        fs.writeFileSync(cacheMetaFile, JSON.stringify(metadata, null, 2));
      }
    } catch (error) {
      console.log('⚠️  Erro ao verificar package.json:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.log('⚠️  Erro ao ler metadados do cache:', error.message);
    return false;
  }
}

/**
 * Limpa o cache do Vite
 */
function cleanCache() {
  try {
    if (fs.existsSync(viteCacheDir)) {
      fs.rmSync(viteCacheDir, { recursive: true, force: true });
      console.log('✅ Cache do Vite limpo');
    }
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error.message);
    process.exit(1);
  }
}

/**
 * Função principal - verifica e limpa cache se necessário
 */
function ensureCache() {
  console.log('🔍 Verificando cache do Vite...');

  if (checkCacheValidity()) {
    console.log('✅ Cache do Vite válido e atualizado');
  } else {
    console.log('🧹 Cache inválido ou expirado, limpando...');
    cleanCache();
  }
}

// Executar verificação
ensureCache();
