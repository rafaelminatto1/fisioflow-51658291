#!/usr/bin/env node

/**
 * Script para validar erros de índices após login
 * Assume que o usuário já está autenticado ou usa contexto persistente
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://moocafisio.com.br';
const CALENDAR_URL = `${PRODUCTION_URL}/calendar?view=week&date=2026-02-19`;

async function validateWithAuth() {
  console.log('🔍 Validando erros de índices do Firestore (com autenticação)...\n');

  const browser = await chromium.launch({
    headless: false, // Mostrar browser
    slowMo: 500
  });

  // Tentar carregar contexto persistente se existir
  const contextPath = path.join(process.cwd(), 'playwright-context');
  let context;

  if (fs.existsSync(contextPath)) {
    console.log('📂 Carregando contexto persistente...');
    context = await browser.newContext({
      storageState: path.join(contextPath, 'auth.json')
    });
  } else {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
  }

  const page = await context.newPage();

  const indexErrors = [];
  const allConsoleMessages = [];
  const networkErrors = [];

  // Coletar mensagens do console
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    allConsoleMessages.push({ type, text, timestamp: new Date().toISOString() });

    // Verificar erros de índice
    if (/requires an index|failed-precondition|create_composite|firestore.*index|The query requires an index/i.test(text)) {
      indexErrors.push({ type, text, timestamp: new Date().toISOString() });
      console.log(`🔴 [${type}] ${text.substring(0, 200)}`);
    }
  });

  // Coletar erros de página
  page.on('pageerror', error => {
    const message = error.message;
    allConsoleMessages.push({ 
      type: 'pageerror', 
      text: message, 
      stack: error.stack,
      timestamp: new Date().toISOString() 
    });

    if (/requires an index|failed-precondition|create_composite|firestore.*index|The query requires an index/i.test(message)) {
      indexErrors.push({ 
        type: 'pageerror', 
        text: message, 
        stack: error.stack,
        timestamp: new Date().toISOString() 
      });
      console.log(`🔴 [pageerror] ${message.substring(0, 200)}`);
    }
  });

  // Coletar erros de rede relacionados a Firestore
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.includes('firestore') || url.includes('runAggregationQuery')) {
      networkErrors.push({
        url,
        failure: request.failure()?.errorText,
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    console.log('📍 Navegando para:', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Verificar se está logado (procurar por elementos que só aparecem quando logado)
    const isLoggedIn = await page.locator('[data-testid="user-menu"], [aria-label*="user"], .user-menu, nav').count() > 0;
    
    if (!isLoggedIn) {
      console.log('⚠️  Parece que não está logado. Verificando página de login...');
      const loginForm = await page.locator('input[type="email"]').count();
      if (loginForm > 0) {
        console.log('❌ Login necessário. Por favor, faça login manualmente no browser que será aberto.');
        console.log('⏸️  Aguardando 30 segundos para você fazer login...');
        await page.waitForTimeout(30000);
      }
    } else {
      console.log('✅ Parece estar logado!');
    }

    // Navegar para calendário
    console.log('\n📅 Navegando para calendário...');
    await page.goto(CALENDAR_URL, { waitUntil: 'networkidle', timeout: 60000 });
    
    console.log('⏳ Aguardando 25 segundos para queries do Firestore executarem...');
    await page.waitForTimeout(25000);

    // Tentar interagir com a página para disparar mais queries
    console.log('🖱️  Interagindo com a página...');
    try {
      // Procurar por elementos do calendário
      const calendarElements = await page.locator('.calendar, [data-testid*="calendar"], .rbc-calendar, .fc-calendar').count();
      console.log(`   Elementos do calendário encontrados: ${calendarElements}`);
      
      // Scroll para garantir que tudo carregou
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(3000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('   (Algumas interações falharam, continuando...)');
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 ANÁLISE COMPLETA DOS ERROS');
    console.log('='.repeat(70));
    console.log(`\n📈 Estatísticas:`);
    console.log(`   Total de mensagens do console: ${allConsoleMessages.length}`);
    console.log(`   Erros de índices encontrados: ${indexErrors.length}`);
    console.log(`   Erros de rede (Firestore): ${networkErrors.length}`);

    if (indexErrors.length > 0) {
      console.log('\n❌ ERROS DE ÍNDICES ENCONTRADOS:\n');
      indexErrors.forEach((error, idx) => {
        console.log(`${idx + 1}. [${error.type}] ${error.text.substring(0, 400)}`);
        if (error.stack) {
          console.log(`   Stack: ${error.stack.substring(0, 200)}...`);
        }
        console.log(`   Timestamp: ${error.timestamp}\n`);
      });
      
      console.log('⚠️  AÇÃO NECESSÁRIA:');
      console.log('   Alguns índices ainda podem estar sendo construídos.');
      console.log('   Execute: ./scripts/check-firestore-indexes.sh');
      console.log('   Aguarde alguns minutos e teste novamente.\n');
    } else {
      console.log('\n✅ NENHUM ERRO DE ÍNDICE ENCONTRADO!');
      console.log('   Os índices do Firestore estão funcionando corretamente.');
      console.log('   Todas as queries devem estar funcionando normalmente.\n');
    }

    if (networkErrors.length > 0) {
      console.log('\n🌐 ERROS DE REDE (Firestore):');
      networkErrors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.url.substring(0, 100)}`);
        console.log(`   Erro: ${err.failure || 'N/A'}\n`);
      });
    }

    // Mostrar outros erros importantes
    const otherErrors = allConsoleMessages.filter(msg => 
      msg.type === 'error' && 
      !indexErrors.some(ie => ie.text === msg.text)
    ).slice(0, 5);

    if (otherErrors.length > 0) {
      console.log('\n⚠️  OUTROS ERROS (não relacionados a índices):');
      otherErrors.forEach((err, idx) => {
        console.log(`${idx + 1}. [${err.type}] ${err.text.substring(0, 150)}`);
      });
    }

    // Screenshot
    await page.screenshot({ 
      path: 'test-results/validation-with-auth.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot salvo: test-results/validation-with-auth.png');

    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMO FINAL');
    console.log('='.repeat(70));
    console.log(`✅ Página acessada: ${CALENDAR_URL}`);
    console.log(`✅ Tempo de espera: 25+ segundos`);
    console.log(`📊 Erros de índices: ${indexErrors.length}`);
    
    if (indexErrors.length === 0) {
      console.log('\n🎉 SUCESSO! Sistema funcionando corretamente.');
    } else {
      console.log('\n⚠️  Ainda há erros. Verifique o status dos índices.');
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Erro durante validação:', error.message);
    await page.screenshot({ 
      path: 'test-results/validation-error.png',
      fullPage: true 
    });
  } finally {
    console.log('\n⏸️  Mantendo browser aberto por 10 segundos para inspeção manual...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

validateWithAuth().catch(console.error);
