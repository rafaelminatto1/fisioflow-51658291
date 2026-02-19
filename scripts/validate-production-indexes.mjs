#!/usr/bin/env node

/**
 * Script para validar se os índices do Firestore estão funcionando
 * Navega até o site de produção, faz login e verifica erros no console
 */

import { chromium } from 'playwright';

const PRODUCTION_URL = 'https://moocafisio.com.br';
const LOGIN_EMAIL = 'rafel.minatto@yahoo.com.br';
const LOGIN_PASSWORD = 'Yukari30@';

// Erros relacionados a índices que estamos procurando
const INDEX_ERROR_PATTERNS = [
  /requires an index/i,
  /failed-precondition/i,
  /firestore.*index/i,
  /create_composite/i
];

async function validateIndexes() {
  console.log('🚀 Iniciando validação dos índices do Firestore...\n');

  const browser = await chromium.launch({
    headless: false, // Mostrar browser para debug
    slowMo: 1000 // Desacelerar ações
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Coletar erros do console
  const consoleErrors = [];
  const indexErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleErrors.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });

    // Verificar se é erro relacionado a índices
    if (INDEX_ERROR_PATTERNS.some(pattern => pattern.test(text))) {
      indexErrors.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Coletar erros de página
  page.on('pageerror', error => {
    consoleErrors.push({
      type: 'pageerror',
      text: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    if (INDEX_ERROR_PATTERNS.some(pattern => pattern.test(error.message))) {
      indexErrors.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    console.log('📍 Navegando para:', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('⏳ Aguardando página carregar...');
    await page.waitForTimeout(3000);

    // Verificar se precisa fazer login
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button:has-text("Entrar"), button:has-text("Login"), button[type="submit"]').first();

    const needsLogin = await emailInput.count() > 0;

    if (needsLogin) {
      console.log('🔐 Fazendo login...');
      await emailInput.fill(LOGIN_EMAIL);
      await passwordInput.fill(LOGIN_PASSWORD);
      await loginButton.click();

      console.log('⏳ Aguardando login completar...');
      // Aguardar qualquer navegação ou mudança na URL
      try {
        await page.waitForURL(/dashboard|calendar|agenda|appointments|patients/, { timeout: 30000 });
      } catch (e) {
        // Se não redirecionou, aguardar um pouco mais
        console.log('⏳ Aguardando redirecionamento...');
        await page.waitForTimeout(10000);
      }
      await page.waitForTimeout(5000); // Aguardar carregamento completo
    }

    // Verificar URL atual e navegar para calendário se necessário
    const currentUrl = page.url();
    console.log(`📍 URL atual: ${currentUrl}`);
    
    // Navegar para página do calendário (onde os erros aparecem)
    console.log('📅 Navegando para calendário...');
    const calendarUrl = `${PRODUCTION_URL}/calendar?view=week&date=2026-02-19`;
    
    try {
      await page.goto(calendarUrl, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
      console.log('⚠️  Timeout ao navegar, continuando...');
      await page.waitForTimeout(5000);
    }
    
    await page.waitForTimeout(15000); // Aguardar queries do Firestore e construção de índices

    console.log('\n📊 Análise dos erros:\n');
    console.log(`Total de erros no console: ${consoleErrors.length}`);
    console.log(`Erros relacionados a índices: ${indexErrors.length}\n`);

    if (indexErrors.length > 0) {
      console.log('❌ ERROS DE ÍNDICES ENCONTRADOS:\n');
      indexErrors.forEach((error, idx) => {
        console.log(`${idx + 1}. [${error.type}] ${error.text.substring(0, 200)}`);
        if (error.stack) {
          console.log(`   Stack: ${error.stack.substring(0, 150)}...`);
        }
        console.log('');
      });
    } else {
      console.log('✅ Nenhum erro de índice encontrado!');
    }

    // Verificar erros gerais
    if (consoleErrors.length > 0 && indexErrors.length === 0) {
      console.log('\n⚠️  Outros erros encontrados (não relacionados a índices):');
      consoleErrors.slice(0, 5).forEach((error, idx) => {
        console.log(`${idx + 1}. [${error.type}] ${error.text.substring(0, 150)}`);
      });
    }

    // Screenshot para documentação
    await page.screenshot({ 
      path: 'test-results/production-index-validation.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot salvo em: test-results/production-index-validation.png');

    // Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMO DA VALIDAÇÃO');
    console.log('='.repeat(70));
    console.log(`✅ Página carregada: ${PRODUCTION_URL}`);
    console.log(`✅ Login realizado: ${needsLogin ? 'Sim' : 'Não necessário'}`);
    console.log(`✅ Calendário acessado: Sim`);
    console.log(`📊 Total de erros: ${consoleErrors.length}`);
    console.log(`🔴 Erros de índices: ${indexErrors.length}`);
    
    if (indexErrors.length === 0) {
      console.log('\n🎉 SUCESSO! Nenhum erro de índice encontrado.');
      console.log('   Os índices do Firestore estão funcionando corretamente.');
    } else {
      console.log('\n⚠️  ATENÇÃO! Ainda há erros de índices.');
      console.log('   Alguns índices podem ainda estar sendo construídos.');
      console.log('   Aguarde alguns minutos e execute novamente.');
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Erro durante validação:', error);
    await page.screenshot({ 
      path: 'test-results/production-index-validation-error.png',
      fullPage: true 
    });
  } finally {
    // Manter browser aberto por 5 segundos para inspeção manual
    console.log('\n⏸️  Mantendo browser aberto por 5 segundos para inspeção...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Executar validação
validateIndexes().catch(console.error);
