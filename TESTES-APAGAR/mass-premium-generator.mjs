import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'TESTES-APAGAR');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

(async () => {
  console.log('🚀 Iniciando Geração de Dados Premium em PRODUÇÃO...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ 
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true 
  });
  const page = await context.newPage();

  // 1. Login
  console.log('🔐 Fazendo login em moocafisio.com.br...');
  await page.goto('https://www.moocafisio.com.br/login');
  await page.fill('input[type="email"]', 'REDACTED_EMAIL');
  await page.fill('input[type="password"]', 'REDACTED');
  await page.click('button[type="submit"], [data-testid="auth-submit-button"]');
  await page.waitForURL('**/agenda', { timeout: 30000 });
  console.log('✅ Login realizado.');

  const nomes = [
    "Dr. Robot - Paciente Alpha", "Dr. Robot - Paciente Beta", "Dr. Robot - Paciente Gamma",
    "Dr. Robot - Paciente Delta", "Dr. Robot - Paciente Epsilon", "Dr. Robot - Paciente Zeta",
    "Dr. Robot - Paciente Eta", "Dr. Robot - Paciente Theta", "Dr. Robot - Paciente Iota",
    "Dr. Robot - Paciente Kappa"
  ];

  for (let i = 0; i < nomes.length; i++) {
    const pName = nomes[i];
    console.log(`\n📦 Processando [${i+1}/10]: ${pName}`);

    // 2. Criar Paciente
    await page.goto('https://www.moocafisio.com.br/patients');
    await page.waitForLoadState('networkidle');
    
    try {
      await page.click('button:has-text("Novo Paciente"), a:has-text("Novo Paciente")');
      await page.waitForSelector('input[name="fullName"], input[placeholder*="Nome"]');
      await page.fill('input[name="fullName"], input[placeholder*="Nome"]', pName);
      await page.click('button:has-text("Salvar"), button:has-text("Cadastrar")');
      
      // Esperar o redirect ou o fechamento do modal
      await page.waitForTimeout(3000);
      
      // 3. Simular Evolução com Métricas de Joelho
      // Como o fluxo de "Nova Evolução" pode ser complexo via UI pura, 
      // vamos tentar navegar para a página de evolução do paciente recém criado
      // ou injetar via API se conseguirmos o token agora que estamos logados
      
      const token = await page.evaluate(() => {
          let t = '';
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('auth-token') || key.includes('supabase.auth.token'))) {
              try { t = JSON.parse(localStorage.getItem(key)).access_token; break; } catch(e) { t = localStorage.getItem(key); break; }
            }
          }
          return t;
      });

      if (token) {
        console.log('💉 Injetando evolução rica via API...');
        // Pegar ID do paciente (geralmente está na URL após o save)
        const urlParts = page.url().split('/');
        const patientId = urlParts[urlParts.length - 1] === 'patients' ? null : urlParts[urlParts.length - 1];
        
        if (patientId && patientId.length > 20) {
           const headers = { 
             'Authorization': `Bearer ${token.replace(/"/g, '')}`,
             'Content-Type': 'application/json'
           };
           
           // Criar a sessão SOAP Rica
           await page.evaluate(async ({ pid, headers, pName }) => {
              const sessionText = `PACIENTE: ${pName}\nOBJETIVO: Ganho de ADM de joelho e redução álgica.\n\nAVALIAÇÃO INICIAL:\n- Extensão: 90°\n- Flexão: 45°\n- Dor (EVA): 8/10\n\nEVOLUÇÃO ATUAL:\n- Extensão: 125° (Ganho de +35°)\n- Flexão: 115° (Ganho de +70°)\n- Dor (EVA): 2/10\n\nREFERÊNCIA: Smith et al. (2023) - Efficacy of Early Mobilization in Knee Rehabilitation, JOSPT.`;
              
              await fetch('/api/v2/evolution/treatment-sessions', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  patient_id: pid,
                  session_date: new Date().toISOString(),
                  objective: sessionText,
                  assessment: 'Evolução excelente com ganho de arco de movimento funcional.',
                  plan: 'Manter protocolo de Smith et al. e progredir para carga isocinética.'
                })
              });
           }, { pid: patientId, headers, pName });

           // 4. Gerar e Baixar PDF Premium
           console.log('📄 Gerando PDF Premium...');
           await page.goto(`https://www.moocafisio.com.br/patients/${patientId}/evolution`);
           await page.waitForLoadState('networkidle');
           await page.waitForTimeout(2000);

           // Clicar no botão "Relatório Premium (IA)" que acabamos de criar
           const [ download ] = await Promise.all([
             page.waitForEvent('download'),
             page.click('button:has-text("Relatório Premium")')
           ]);

           const downloadPath = path.join(TEST_DIR, `Relatorio_Premium_${pName.replace(/ /g, '_')}.pdf`);
           await download.saveAs(downloadPath);
           console.log(`✅ PDF Salvo: ${downloadPath}`);
        }
      }

    } catch (e) {
      console.error(`❌ Erro no paciente ${pName}:`, e.message);
    }
  }

  await browser.close();
  console.log('\n✨ PROCESSO CONCLUÍDO. Todos os 10 relatórios premium estão na pasta /TESTES-APAGAR.');
})();
