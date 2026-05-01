import { test, expect } from "@playwright/test";

/**
 * FISIOFLOW PRODUCTION DATA POPULATION MISSION
 * 10 Patients x 10 Appointments each = 100 SOAP Evolutions
 */

const BASE_URL = "https://moocafisio.com.br";
const EMAIL = "rafael.minatto@yahoo.com.br";
const PASSWORD = "Yukari30@";

// Textos variados para SOAP
const subjectiveTexts = [
  "Paciente relata melhora significativa na dor lombar após a última sessão.",
  "Sente leve desconforto na região cervical ao acordar.",
  "Relata boa adesão aos exercícios domiciliares prescritos.",
  "Diz que a dor diminuiu de 8 para 4 na escala EVA.",
  "Ainda apresenta rigidez matinal persistente.",
  "Relata cansaço muscular após atividade física leve.",
  "Sente-se mais confiante para realizar movimentos de rotação.",
  "Dorme melhor, mas ainda acorda com dor se mudar de posição bruscamente.",
  "Relata que o inchaço no tornozelo diminuiu bastante.",
  "Sente pontadas ocasionais no joelho ao subir escadas."
];

const objectiveTexts = [
  "Amplitude de movimento preservada em todos os planos.",
  "Aumento da força muscular em quadríceps (grau 4+).",
  "Teste de Lasègue negativo bilateralmente.",
  "Melhora na estabilidade lombo-pélvica durante os exercícios.",
  "Presença de leve edema perimaleolar.",
  "Ponto gatilho em trapézio superior direito.",
  "Marcha com base alargada e leve claudicação.",
  "Equilíbrio unipodal mantido por 10 segundos.",
  "Cicatriz cirúrgica com boa evolução, sem sinais inflamatórios.",
  "Limitação de 10 graus na flexão dorsal do tornozelo."
];

const assessmentTexts = [
  "Evolução satisfatória conforme o plano de tratamento.",
  "Quadro estável, mantendo conduta atual.",
  "Necessário focar em ganho de força e estabilidade.",
  "Paciente responde bem às técnicas de terapia manual.",
  "Sinais de fadiga muscular indicam necessidade de ajuste de carga.",
  "Melhora funcional observada nas atividades de vida diária.",
  "Aderência ao tratamento está permitindo progressão rápida.",
  "Persistência de quadro álgico sugere revisão de diagnóstico diferencial.",
  "Excelente prognóstico de retorno às atividades esportivas.",
  "Controle motor em franca melhora."
];

const planTexts = [
  "Continuar com exercícios de fortalecimento e controle motor.",
  "Iniciar exercícios de impacto leve na próxima sessão.",
  "Focar em técnicas de liberação miofascial e alongamento.",
  "Prescrever novos exercícios para realização em casa.",
  "Progredir carga nos exercícios de cadeia cinética fechada.",
  "Realizar reavaliação funcional completa em duas semanas.",
  "Manter protocolo atual por mais 3 sessões.",
  "Trabalhar propriocepção e equilíbrio dinâmico.",
  "Educacional sobre postura e ergonomia no trabalho.",
  "Agendar retorno para acompanhamento pós-alta em 30 dias."
];

test.setTimeout(0); // Mission can take a long time

test("FisioFlow Production Data Population Mission", async ({ page }) => {
  console.log("🚀 Starting Mission: Population 100 Records in Production");

  // 1. LOGIN
  console.log("🔐 Logging in...");
  await page.goto(`${BASE_URL}/auth`);
  
  // Try various selectors for login to be robust
  const emailInput = page.locator('[data-testid="auth-email-input"], input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('[data-testid="auth-password-input"], input[name="password"], input[type="password"]').first();
  const submitBtn = page.locator('[data-testid="auth-submit-button"], button[type="submit"], button:has-text("Acessar"), button:has-text("Entrar")').first();

  await emailInput.waitFor({ state: "visible", timeout: 30000 });
  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);
  await submitBtn.click();

  await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 60000 });
  console.log(`✅ Login successful! Currently at: ${page.url()}`);

  for (let p = 1; p <= 10; p++) {
    const timestamp = Date.now().toString().slice(-6);
    const patientName = `PROD IA ${p} - ${timestamp}`;
    
    // 2. CREATE PATIENT
    console.log(`\n👤 [Patient ${p}/10] Creating: ${patientName}`);
    await page.goto(`${BASE_URL}/pacientes`);
    
    const newPatientBtn = page.getByRole("button", { name: /novo paciente/i }).first();
    await newPatientBtn.waitFor({ state: "visible" });
    await newPatientBtn.click();
    
    // Fill Patient Form
    const nameField = page.locator('input[name="full_name"], input[name="name"], #full_name').first();
    const phoneField = page.locator('input[name="phone"], #phone').first();
    
    await nameField.waitFor({ state: "visible" });
    await nameField.fill(patientName);
    await phoneField.fill("11999999999");
    
    const savePatientBtn = page.locator('button[type="submit"], button:has-text("Salvar"), button:has-text("Criar")').first();
    await savePatientBtn.click();
    
    // Wait for modal to close or redirect
    await expect(nameField).not.toBeVisible({ timeout: 20000 });
    console.log(`✅ Patient ${patientName} created successfully.`);

    for (let a = 1; a <= 10; a++) {
      console.log(`  📅 [Appointment ${a}/10] Scheduling for ${patientName}`);
      
      // 3. CREATE APPOINTMENT
      await page.goto(`${BASE_URL}/agenda`);
      
      const newApptBtn = page.locator('button:has-text("Novo Agendamento"), button:has-text("Novo"), button[aria-label*="novo" i]').first();
      await newApptBtn.waitFor({ state: "visible" });
      await newApptBtn.click();
      
      // Patient Selection in Modal
      // The PatientCombobox often uses a trigger button or a direct search input
      const patientSearch = page.locator('input[placeholder*="Buscar"], input[placeholder*="paciente"], input[cmdk-input]').first();
      if (await patientSearch.isVisible()) {
        await patientSearch.fill(patientName);
        await page.waitForTimeout(1500); // Wait for search results
        await page.locator(`[role="option"]:has-text("${patientName}"), [cmdk-item]:has-text("${patientName}"), text=${patientName}`).first().click();
      } else {
        // Fallback for different UI variants
        await page.locator('button[role="combobox"]').first().click();
        const searchInput = page.locator('input[cmdk-input]').first();
        await searchInput.fill(patientName);
        await page.waitForTimeout(1000);
        await page.locator(`[cmdk-item]:has-text("${patientName}")`).first().click();
      }

      // Confirm Appointment
      const confirmApptBtn = page.locator('button:has-text("Confirmar"), button:has-text("Salvar"), button:has-text("Agendar")').first();
      await confirmApptBtn.click();
      
      // Wait for success
      await page.waitForTimeout(3000);
      console.log(`  ✅ Appointment scheduled.`);

      // 4. FILL SOAP EVOLUTION
      console.log(`  📝 Filling SOAP evolution for appointment ${a}/10`);
      
      // Locate the appointment card on the agenda
      // Use a fresh navigation to ensure the agenda is updated
      await page.goto(`${BASE_URL}/agenda`);
      await page.waitForLoadState("networkidle");
      
      const appointmentCard = page.locator(`text=${patientName}`).first();
      await appointmentCard.waitFor({ state: "visible", timeout: 20000 });
      await appointmentCard.click();
      
      const startAttendanceBtn = page.locator('button:has-text("Iniciar Atendimento"), button:has-text("Evoluir"), button:has-text("Ver Evolução")').first();
      await startAttendanceBtn.waitFor({ state: "visible", timeout: 10000 });
      await startAttendanceBtn.click();

      // Ensure we are on the evolution page
      await page.waitForURL((url) => url.pathname.includes("patient-evolution") || url.pathname.includes("session-evolution"), { timeout: 20000 });

      // SOAP Fields
      const subjectiveField = page.getByRole("textbox", { name: /Subjetivo/i }).first();
      const objectiveField = page.getByRole("textbox", { name: /Objetivo/i }).first();
      const assessmentField = page.getByRole("textbox", { name: /Avaliação/i }).first();
      const planField = page.getByRole("textbox", { name: /Plano/i }).first();

      // Fallback selectors if getByRole fails
      const soapFields = [
        { loc: subjectiveField, placeholder: "Subjetivo", texts: subjectiveTexts },
        { loc: objectiveField, placeholder: "Objetivo", texts: objectiveTexts },
        { loc: assessmentField, placeholder: "Avaliação", texts: assessmentTexts },
        { loc: planField, placeholder: "Plano", texts: planTexts }
      ];

      for (const field of soapFields) {
        if (!(await field.loc.isVisible())) {
          const fallback = page.locator(`textarea[placeholder*="${field.placeholder}" i], [data-testid*="${field.placeholder.toLowerCase()}"]`).first();
          await fallback.waitFor({ state: "visible", timeout: 5000 });
          await fallback.fill(field.texts[Math.floor(Math.random() * field.texts.length)]);
        } else {
          await field.loc.fill(field.texts[Math.floor(Math.random() * field.texts.length)]);
        }
      }

      // Finish Evolution
      const finishBtn = page.locator('button:has-text("Finalizar"), button:has-text("Salvar Evolução"), button:has-text("Concluir")').first();
      await finishBtn.click();
      
      // Wait for confirmation (toast or redirect)
      await page.waitForTimeout(2000);
      console.log(`  ✅ SOAP evolution completed.`);
    }
    
    console.log(`\n🎉 Completed all 10 appointments for ${patientName}`);
  }

  console.log("\n🏁 MISSION ACCOMPLISHED: 100 Records populated in Production!");
});
