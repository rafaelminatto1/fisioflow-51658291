#!/usr/bin/env node

/**
 * Script simplificado para verificar erros de console relacionados a índices
 * Acessa diretamente a página e coleta erros sem fazer login
 */

import { chromium } from 'playwright';

const PRODUCTION_URL = 'https://moocafisio.com.br/calendar?view=week&date=2026-02-19';

async function checkErrors() {
  console.log('🔍 Verificando erros de índices do Firestore...\n');

  const browser = await chromium.launch({
    headless: true // Headless para evitar captcha
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const indexErrors = [];
  const allErrors = [];

  // Coletar erros do console
  page.on('console', msg => {
    const text = msg.text();
    allErrors.push({ type: msg.type(), text });

    // Verificar erros de índice
    if (/requires an index|failed-precondition|create_composite|firestore.*index/i.test(text)) {
      indexErrors.push({ type: msg.type(), text });
    }
  });

  page.on('pageerror', error => {
    allErrors.push({ type: 'pageerror', text: error.message });
    if (/requires an index|failed-precondition|create_composite|firestore.*index/i.test(error.message)) {
      indexErrors.push({ type: 'pageerror', text: error.message });
    }
  });

  try {
    console.log('📍 Acessando:', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    console.log('⏳ Aguardando 20 segundos para queries do Firestore...');
    await page.waitForTimeout(20000);

    console.log('\n📊 Resultados:\n');
    console.log(`Total de erros: ${allErrors.length}`);
    console.log(`Erros de índices: ${indexErrors.length}\n`);

    if (indexErrors.length > 0) {
      console.log('❌ ERROS DE ÍNDICES ENCONTRADOS:\n');
      indexErrors.forEach((err, i) => {
        console.log(`${i + 1}. [${err.type}] ${err.text.substring(0, 300)}`);
      });
      console.log('\n⚠️  Alguns índices ainda podem estar sendo construídos.');
    } else {
      console.log('✅ Nenhum erro de índice encontrado!');
      console.log('   Os índices do Firestore estão funcionando corretamente.');
    }

    // Mostrar alguns erros gerais se houver
    const otherErrors = allErrors.filter(e => 
      !indexErrors.some(ie => ie.text === e.text)
    ).slice(0, 3);

    if (otherErrors.length > 0) {
      console.log('\n📋 Outros erros (não relacionados a índices):');
      otherErrors.forEach((err, i) => {
        console.log(`${i + 1}. [${err.type}] ${err.text.substring(0, 150)}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await browser.close();
  }
}

checkErrors();
