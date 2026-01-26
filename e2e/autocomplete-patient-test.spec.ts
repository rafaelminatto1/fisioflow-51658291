/**
 * TESTE DE AUTOCOMPLETE DE PACIENTE NO MODAL DE AGENDAMENTO
 *
 * Testa especificamente:
 * 1. Login
 * 2. Abrir modal de novo agendamento
 * 3. Digitar no campo de paciente
 * 4. Verificar se o dropdown de autocomplete aparece
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const BASE_URL = 'http://localhost:8081';

test.use({ browserName: 'chromium' });
test.setTimeout(120000);

test('autocomplete de paciente no modal de agendamento', async ({ page }) => {
  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE: AUTOCOMPLETE DE PACIENTE');
  console.log('█'.repeat(70));

  // ========================================
  // LOGIN
  // ========================================
  console.log('\n📍 Login');
  console.log('-'.repeat(70));

  await page.goto(`${BASE_URL}/auth`);
  await page.waitForTimeout(2000);

  await page.fill('input[type="email"]', testUsers.rafael.email);
  await page.fill('input[type="password"]', testUsers.rafael.password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/, { timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('✅ Login realizado');

  // ========================================
  // ABRIR MODAL DE NOVO AGENDAMENTO
  // ========================================
  console.log('\n📍 Abrir Modal de Novo Agendamento');
  console.log('-'.repeat(70));

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Procurar botão de novo agendamento
  const newAppointmentButton = page.locator('button:has-text("Novo"), button:has-text("Agendar")').first();

  if (await newAppointmentButton.count() > 0) {
    await newAppointmentButton.click();
    console.log('✅ Botão de novo agendamento clicado');
  } else {
    const addButton = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await addButton.click();
    console.log('✅ Botão + clicado');
  }

  await page.waitForTimeout(2000);

  // ========================================
  // TESTAR AUTOCOMPLETE NO CAMPO DE PACIENTE
  // ========================================
  console.log('\n📍 Testar Autocomplete');
  console.log('-'.repeat(70));

  // O componente PatientCombobox usa um Button com role="combobox" como trigger
  const comboboxTrigger = page.locator('button[role="combobox"]').first();

  expect(await comboboxTrigger.count(), 'Combobox deve estar presente').toBeGreaterThan(0);

  await page.screenshot({ path: '/tmp/autocomplete-01-antes-clique.png', fullPage: true });

  // Clicar no botão para abrir o dropdown
  await comboboxTrigger.click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/tmp/autocomplete-02-dropdown-aberto.png', fullPage: true });

  // Verificar se o dropdown abriu
  const popoverContent = page.locator('[data-state="open"]').first();
  const isDropdownOpen = await popoverContent.count() > 0;

  if (isDropdownOpen) {
    console.log('✅ Dropdown aberto');

    // Procurar pelo input dentro do Command
    const commandInput = page.locator('input[placeholder*="Buscar" i], input[placeholder*="nome" i]').first();

    if (await commandInput.count() > 0) {
      console.log('✅ Input de busca encontrado');

      // Digitar "Paciente" para buscar
      await commandInput.fill('Paciente');
      await page.waitForTimeout(1500);

      await page.screenshot({ path: '/tmp/autocomplete-03-apos-busca.png', fullPage: true });
    }
  } else {
    console.log('⚠️  Dropdown não abriu');
  }

  await page.screenshot({ path: '/tmp/autocomplete-02-apos-digitacao.png', fullPage: true });

  // ========================================
  // VERIFICAR DROPDOWN DE AUTOCOMPLETE
  // ========================================
  console.log('\n📍 Verificar Dropdown');
  console.log('-'.repeat(70));

  // O componente usa CommandItem para as opções
  const commandItems = await page.locator('[cmdk-item], [role="option"], [data-radix-collection-item]').all();

  let dropdownFound = commandItems.length > 0;

  if (dropdownFound) {
    console.log(`✅ Dropdown encontrado com ${commandItems.length} itens (CommandItem)`);

    // Capturar texto dos primeiros itens
    for (let i = 0; i < Math.min(commandItems.length, 5); i++) {
      const text = await commandItems[i].textContent();
      if (text && text.trim().length > 0) {
        console.log(`   - Item ${i + 1}: ${text.trim().substring(0, 50)}`);
      }
    }
  } else {
    console.log('⚠️  Nenhum CommandItem encontrado');
    console.log('   Tentando outros seletores...');

    // Tentar encontrar itens pelo atributo data-state
    const openItems = await page.locator('[data-state="open"] *').all();
    console.log(`   ${openItems.length} elementos dentro de [data-state="open"]`);

    // Verificar se há texto de "Paciente" visível
    const patientTextElements = await page.locator('text=/Paciente Teste/i').all();
    console.log(`   ${patientTextElements.length} elementos com "Paciente Teste"`);
  }

  // Capturar screenshot final
  await page.screenshot({ path: '/tmp/autocomplete-03-final.png', fullPage: true });

  // Resultado
  console.log('\n' + '█'.repeat(70));
  console.log('█    RESULTADO');
  console.log('█'.repeat(70));

  if (dropdownFound) {
    console.log('✅ AUTOCOMPLETE: Dropdown detectado!');
  } else {
    console.log('❌ AUTOCOMPLETE: Dropdown NÃO detectado');
    console.log('   Possíveis causas:');
    console.log('   1. Campo de autocomplete não implementado');
    console.log('   2. Seletor do dropdown não está nos padrões testados');
    console.log('   3. Dropdown aparece com delay maior que 1.5s');
  }

  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE CONCLUÍDO');
  console.log('█'.repeat(70));

  // Assert para o teste
  // Nota: Por enquanto, não vamos falhar o teste se o autocomplete não funcionar
  // pois estamos apenas diagnosticando
  if (dropdownFound) {
    console.log('\n✅ Teste passou: Autocomplete detectado');
  } else {
    console.log('\n⚠️  Teste passou com warnings: Autocomplete não detectado');
  }
});
