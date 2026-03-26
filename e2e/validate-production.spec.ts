import { test, expect } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';

const loginEmail = 'REDACTED_EMAIL';
const loginPassword = 'REDACTED';
const baseURL = 'https://www.moocafisio.com.br';

function generateValidCpf(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const calcDigit = (base: number[]) => {
    const sum = base.reduce((acc, value, index) => acc + value * (base.length + 1 - index), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calcDigit(digits);
  const d2 = calcDigit([...digits, d1]);
  return [...digits, d1, d2].join('');
}

test.describe('Validação em Produção - Cadastro de Paciente', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Deve realizar login e cadastrar um novo paciente com sucesso', async ({ page }) => {
    // 1. Autenticação via Neon Auth
    console.log('[Test] Autenticando...');
    await authenticateBrowserContext(page.context(), loginEmail, loginPassword);

    // 2. Acessar a página de pacientes
    console.log('[Test] Acessando a página de pacientes...');
    await page.goto(`${baseURL}/patients`, { waitUntil: 'networkidle' });

    // 3. Clicar em Novo Paciente
    console.log('[Test] Abrindo formulário de novo paciente...');
    const addButton = page.locator('button:has-text("Novo Paciente"), [data-testid="add-patient"]').first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    // 4. Preencher o formulário
    console.log('[Test] Preenchendo formulário...');
    const patientForm = page.locator('form').filter({ has: page.locator('[data-testid="patient-name"]') }).first();
    await patientForm.waitFor({ state: 'visible', timeout: 15000 });

    const newPatientName = `Teste Prod ${Date.now()}`;
    await page.locator('[data-testid="patient-name"]').fill(newPatientName);

    // Data de nascimento (usando SmartDatePicker)
    const birthdateBtn = page.locator('[data-testid="patient-birthdate"]');
    await birthdateBtn.click();
    const dayBtn = page.locator('[role="grid"] button:not([disabled])').first();
    await dayBtn.click();

    await page.locator('[data-testid="patient-cpf"]').fill(generateValidCpf());
    await page.locator('[data-testid="patient-phone"]').fill('11999999999');

    // Mudar para a aba Médico para preencher a condição principal (obrigatória em alguns schemas)
    const medicoTab = page.locator('button[role="tab"]:has-text("Médico")');
    if (await medicoTab.isVisible()) {
      await medicoTab.click();
      await page.locator('input#main_condition, [name="main_condition"]').fill('Teste de Produção - Cadastro');
    }

    // 5. Enviar
    console.log('[Test] Enviando formulário...');
    const submitButton = page.locator('button[type="submit"]:has-text("Finalizar"), button[type="submit"]:has-text("Salvar")').first();
    await submitButton.click();

    // 6. Validar sucesso
    console.log('[Test] Aguardando confirmação de sucesso...');
    
    // Esperar redirecionamento para o perfil do paciente ou toast de sucesso
    // A rota de perfil é /patients/:id
    await page.waitForURL(/\/patients\/[^/]+/, { timeout: 30000 });
    console.log(`[Test] Redirecionado com sucesso para: ${page.url()}`);

    // Verificar se o nome do paciente está no perfil
    await expect(page.locator('h1, h2').filter({ hasText: newPatientName }).first()).toBeVisible({ timeout: 15000 });
    
    console.log('[Test] Cadastro realizado e validado com sucesso!');
  });
});
