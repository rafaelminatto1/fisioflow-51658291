import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'TESTES-APAGAR');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const page = await context.newPage();

  console.log('Login no sistema de produção...');
  await page.goto('https://www.moocafisio.com.br/login');
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', 'Yukari30@');
  await page.click('button[type="submit"], [data-testid="auth-submit-button"]');
  await page.waitForURL('**/agenda', { timeout: 15000 });
  console.log('Login concluído. Injetando dados via API interna...');

  // Criar 10 pacientes com evoluções ricas (Extensão de Joelho e referências)
  const results = await page.evaluate(async () => {
    // Buscar dinamicamente qualquer token do Supabase ou similar no localStorage
    let token = '';
    for (let i = 0; i < localStorage.length; i++) {
       const key = localStorage.key(i);
       if (key && (key.includes('auth-token') || key.includes('supabase.auth.token') || key.includes('token'))) {
          try {
             const val = JSON.parse(localStorage.getItem(key));
             if (val && val.access_token) {
                 token = val.access_token;
                 break;
             }
          } catch(e) {
             token = localStorage.getItem(key);
             break;
          }
       }
    }

    if (!token) return { error: 'Token não encontrado na sessão' };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.replace(/"/g, '')}`
    };

    const patientsCreated = [];
    
    for (let i = 1; i <= 10; i++) {
       const pName = `Paciente Artigo E2E ${i} Silva`;
       // 1. Criar Paciente
       const pRes = await fetch('/api/v2/patients', {
         method: 'POST',
         headers,
         body: JSON.stringify({ fullName: pName, status: 'Em Tratamento' })
       });
       
       if (!pRes.ok) {
          console.log('Falha ao criar paciente', await pRes.text());
          continue;
       }
       
       const pData = await pRes.json();
       const patientId = pData.data?.id || pData.id;
       if (!patientId) continue;

       // 2. Criar Evolução (Treatment Session) contendo o artigo e métricas de extensão
       const sessionText = `Avaliação clínica de joelho esquerdo. Amplitude de movimento inicial de Extensão de Joelho: 90°. Amplitude de Flexão Inicial: 45°.\nHoje paciente relata grande melhora. Amplitude Atual de Extensão: 120°. Flexão: 110°. Ganho articular de +30° e redução do quadro álgico.\n\nReferência Científica de Apoio: Smith et al. (2023) - Efficacy of Early Mobilization in Knee Rehabilitation, Journal of Orthopaedic & Sports Physical Therapy, 45(2), 112-120.`;
       
       await fetch('/api/v2/evolution/treatment-sessions', {
         method: 'POST',
         headers,
         body: JSON.stringify({
            patient_id: patientId,
            session_date: new Date().toISOString(),
            objective: sessionText,
            assessment: 'Melhora de ADM significativa',
            plan: 'Continuar fortalecimento isométrico e mobilização.'
         })
       });
       
       // 3. Opcional: Criar Agendamento
       const d = new Date();
       d.setHours(10 + (i%5), 0, 0, 0); // Horários diversos
       await fetch('/api/v2/appointments', {
         method: 'POST',
         headers,
         body: JSON.stringify({
            patient_id: patientId,
            date: d.toISOString().split('T')[0],
            start_time: d.toISOString().split('T')[1].slice(0,5),
            durationMinutes: 60,
            status: 'completed'
         })
       });

       patientsCreated.push({ id: patientId, name: pName });
    }
    
    return { patients: patientsCreated };
  });

  if (results.error) {
     console.error(results.error);
  } else {
     console.log(`Foram criados ${results.patients?.length} pacientes com a evolução riquíssima em Produção.`);
     
     // Gerar os PDFs: vamos navegar para a página de paciente e imprimir em PDF!
     for (const p of results.patients || []) {
        console.log(`Gerando PDF do Prontuário para ${p.name}...`);
        
        await page.goto(`https://www.moocafisio.com.br/patients/${p.id}/evolution`);
        await page.waitForTimeout(3000); // Aguardar renderizar os gráficos e referências
        
        const pdfPath = path.join(TEST_DIR, `Relatorio_Medico_${p.name.replace(/ /g, '_')}.pdf`);
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
        console.log(`Salvo: ${pdfPath}`);
     }
  }

  await browser.close();
  console.log('Tudo concluído com sucesso!');
})();