#!/usr/bin/env node

/**
 * Script para validar erros após login manual
 * Abre o browser e aguarda você fazer login, depois verifica erros
 */

import { chromium } from 'playwright';

const PRODUCTION_URL = 'https://moocafisio.com.br';
const CALENDAR_URL = `${PRODUCTION_URL}/calendar?view=week&date=2026-02-19`;

async function validateAfterManualLogin() {
  console.log('🔍 Validação de Erros de Índices do Firestore\n');
  console.log('='.repeat(70));
  console.log('📋 INSTRUÇÕES:');
  console.log('1. O browser será aberto');
  console.log('2. Faça login manualmente se necessário');
  console.log('3. Navegue até o calendário');
  console.log('4. O script coletará erros automaticamente');
  console.log('='.repeat(70));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  const indexErrors = [];
  const allMessages = [];
  const firestoreRequests = [];

  // Coletar TODAS as mensagens do console
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    allMessages.push({ type, text, timestamp: Date.now() });

    // Verificar erros de índice
    const isIndexError = /requires an index|failed-precondition|create_composite|firestore.*index|The query requires an index|runAggregationQuery.*failed/i.test(text);
    
    if (isIndexError) {
      indexErrors.push({ type, text, timestamp: Date.now() });
      console.log(`\n🔴 ERRO DE ÍNDICE DETECTADO:`);
      console.log(`   [${type}] ${text.substring(0, 500)}`);
    }
  });

  // Coletar erros de página
  page.on('pageerror', error => {
    const message = error.message;
    allMessages.push({ type: 'pageerror', text: message, stack: error.stack });
    
    if (/requires an index|failed-precondition|create_composite|firestore.*index|The query requires an index/i.test(message)) {
      indexErrors.push({ type: 'pageerror', text: message, stack: error.stack });
      console.log(`\n🔴 ERRO DE ÍNDICE (pageerror):`);
      console.log(`   ${message.substring(0, 500)}`);
    }
  });

  // Monitorar requisições do Firestore
  page.on('response', response => {
    const url = response.url();
    if (url.includes('firestore.googleapis.com') || url.includes('runAggregationQuery')) {
      const status = response.status();
      if (status >= 400) {
        firestoreRequests.push({
          url: url.substring(0, 150),
          status,
          timestamp: Date.now()
        });
      }
    }
  });

  try {
    console.log('📍 Abrindo:', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    console.log('\n⏳ Aguardando 60 segundos para você fazer login e navegar...');
    console.log('   (Você pode navegar livremente no browser)');
    console.log('   (O script continuará coletando erros)\n');
    
    await page.waitForTimeout(60000); // 60 segundos para login manual

    // Tentar navegar para calendário automaticamente
    console.log('📅 Navegando para calendário...');
    await page.goto(CALENDAR_URL, { waitUntil: 'networkidle', timeout: 60000 });
    
    console.log('⏳ Aguardando 30 segundos para queries do Firestore...');
    await page.waitForTimeout(30000);

    // Scroll para disparar lazy loading
    console.log('🖱️  Fazendo scroll para carregar mais conteúdo...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(2000);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(5000);

    // Análise final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESULTADO DA ANÁLISE');
    console.log('='.repeat(70));
    
    const errorMessages = allMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
    const warningMessages = allMessages.filter(m => m.type === 'warning');
    
    console.log(`\n📈 Estatísticas:`);
    console.log(`   Total de mensagens: ${allMessages.length}`);
    console.log(`   Erros: ${errorMessages.length}`);
    console.log(`   Avisos: ${warningMessages.length}`);
    console.log(`   Erros de índices: ${indexErrors.length}`);
    console.log(`   Requisições Firestore com erro: ${firestoreRequests.length}`);

    if (indexErrors.length > 0) {
      console.log('\n❌ ERROS DE ÍNDICES ENCONTRADOS:\n');
      indexErrors.forEach((error, idx) => {
        console.log(`${idx + 1}. [${error.type}]`);
        console.log(`   ${error.text.substring(0, 600)}`);
        if (error.stack) {
          console.log(`   Stack: ${error.stack.substring(0, 300)}...`);
        }
        console.log('');
      });
      
      console.log('⚠️  RECOMENDAÇÃO:');
      console.log('   Execute: ./scripts/check-firestore-indexes.sh');
      console.log('   Verifique se todos os índices estão READY\n');
    } else {
      console.log('\n✅ NENHUM ERRO DE ÍNDICE ENCONTRADO!');
      console.log('   Os índices do Firestore estão funcionando corretamente.\n');
    }

    if (firestoreRequests.length > 0) {
      console.log('\n🌐 Requisições Firestore com erro:');
      firestoreRequests.forEach((req, idx) => {
        console.log(`${idx + 1}. Status ${req.status}: ${req.url}`);
      });
    }

    // Mostrar alguns erros gerais
    const otherErrors = errorMessages.filter(e => 
      !indexErrors.some(ie => ie.text === e.text)
    ).slice(0, 5);

    if (otherErrors.length > 0) {
      console.log('\n⚠️  Outros erros (não relacionados a índices):');
      otherErrors.forEach((err, idx) => {
        console.log(`${idx + 1}. [${err.type}] ${err.text.substring(0, 200)}`);
      });
    }

    // Screenshot
    await page.screenshot({ 
      path: 'test-results/final-validation.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot: test-results/final-validation.png');

    console.log('\n' + '='.repeat(70));
    if (indexErrors.length === 0) {
      console.log('🎉 SUCESSO! Nenhum erro de índice encontrado.');
    } else {
      console.log('⚠️  Ainda há erros de índices. Verifique o status.');
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    console.log('\n⏸️  Browser permanecerá aberto por mais 15 segundos...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

validateAfterManualLogin().catch(console.error);
