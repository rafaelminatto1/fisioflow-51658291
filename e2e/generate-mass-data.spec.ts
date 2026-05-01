import { test, expect } from "@playwright/test";

/**
 * Script de Geração de Dados em Massa para Produção
 * 10 Pacientes x 10 Agendamentos cada = 100 Evoluções
 */

const BASE_URL = "https://moocafisio.com.br";
const EMAIL = "rafael.minatto@yahoo.com.br";
const PASSWORD = "Yukari30@";

test.setTimeout(0); // Sem timeout para execução longa

test("gerar 10 pacientes com 10 agendamentos e evoluções cada", async ({ page }) => {
  // 1. Login
  await page.goto(`${BASE_URL}/auth`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  
  // Esperar qualquer URL que indique sucesso no login (não estar mais na /auth)
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 30000 });
  console.log(`✅ Login bem-sucedido. URL atual: ${page.url()}`);

  for (let p = 1; p <= 10; p++) {
    const patientName = `Paciente IA ${p} - ${Date.now().toString().slice(-4)}`;
    
    // 2. Criar Paciente
    await page.goto(`${BASE_URL}/pacientes`);
    console.log(`👤 Abrindo página de pacientes para: ${patientName}`);
    
    // Clicar no botão para abrir o modal
    const newPatientBtn = page.getByRole('button', { name: /novo paciente/i });
    await newPatientBtn.waitFor({ state: 'visible' });
    await newPatientBtn.click();
    
    await page.waitForSelector('input#full_name', { state: 'visible', timeout: 30000 });
    await page.fill('input#full_name', patientName);
    await page.fill('input#phone', "11999999999");
    
    // O botão de salvar
    const submitBtn = page.locator('button[type="submit"], button:has-text("Salvar"), button:has-text("Criar")').first();
    await submitBtn.click();
    
    // Esperar o modal fechar
    await page.waitForSelector('input#full_name', { state: 'hidden', timeout: 15000 });
    console.log(`✅ Paciente criado: ${patientName}`);

    for (let a = 1; a <= 10; a++) {
      // 3. Criar Agendamento
      await page.goto(`${BASE_URL}/agenda`);
      console.log(`📅 Abrindo página de agenda para agendamento ${a}/10 de ${patientName}`);
      
      const newApptBtn = page.getByRole('button', { name: /novo agendamento/i });
      await newApptBtn.waitFor({ state: 'visible' });
      await newApptBtn.click();
      
      // Buscar paciente no campo de busca do agendamento
      const searchInput = page.locator('input[placeholder*="Buscar paciente"], input[placeholder*="Selecionar paciente"]').first();
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(patientName);
      
      // Clicar no resultado da busca
      await page.click(`text=${patientName}`);
      
      // Confirmar agendamento
      const confirmBtn = page.locator('button:has-text("Confirmar Agendamento"), button:has-text("Salvar Agendamento"), button:has-text("Agendar")').first();
      await confirmBtn.click();
      
      // Esperar modal fechar
      await page.waitForTimeout(3000); 
      console.log(`✅ Agendamento ${a}/10 criado`);

      // 4. Registrar Evolução SOAP
      // No cockpit da agenda, clicar no paciente para abrir o card
      await page.goto(`${BASE_URL}/agenda`);
      await page.waitForLoadState('networkidle');
      
      // Tentar encontrar o card do paciente na agenda
      const patientCard = page.locator(`text=${patientName}`).first();
      await patientCard.click();
      
      // Botão "Iniciar Atendimento"
      const startBtn = page.locator('button:has-text("Iniciar Atendimento")').first();
      await startBtn.waitFor({ state: 'visible', timeout: 10000 });
      await startBtn.click();
      
      // Preencher SOAP
      await page.waitForSelector('textarea[placeholder*="Subjetivo"]', { state: 'visible' });
      await page.fill('textarea[placeholder*="Subjetivo"]', `Paciente IA ${p} - Sessão ${a}: Evoluindo bem.`);
      await page.fill('textarea[placeholder*="Objetivo"]', `Sessão ${a}: Teste de carga e mobilidade.`);
      await page.fill('textarea[placeholder*="Avaliação"]', "Resultado esperado.");
      await page.fill('textarea[placeholder*="Plano"]', "Continuidade.");
      
      // Finalizar
      const finishBtn = page.locator('button:has-text("Finalizar Evolução"), button:has-text("Salvar Evolução")').first();
      await finishBtn.click();
      
      console.log(`📝 Evolução ${a}/10 finalizada`);
      await page.waitForTimeout(1000);
    }
  }

  console.log("🏁 Geração de dados em massa concluída com sucesso!");
});
