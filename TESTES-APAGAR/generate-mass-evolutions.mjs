import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Tentativa final de injeção massiva via API...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.moocafisio.com.br/login');
  await page.fill('input[type="email"]', 'REDACTED_EMAIL');
  await page.fill('input[type="password"]', 'REDACTED');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/agenda');

  // Sweep all possible token keys
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth-token') || key.includes('supabase.auth.token') || key.includes('token'))) {
        try {
          const val = JSON.parse(localStorage.getItem(key));
          if (val && val.access_token) return val.access_token;
          if (typeof val === 'string') return val;
        } catch(e) {
          const val = localStorage.getItem(key);
          if (val && val.length > 50) return val;
        }
      }
    }
    return '';
  });

  if (!token) {
    console.error('❌ Falha ao capturar token de segurança.');
    await browser.close();
    return;
  }

  console.log('✅ Token capturado. Iniciando injeção...');

  await page.goto('https://www.moocafisio.com.br/patients');
  await page.waitForTimeout(3000);

  const patients = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-patient-id], a'))
      .filter(el => el.innerText.includes('Dr. Robot'))
      .map(el => {
          const id = el.getAttribute('data-patient-id') || (el.href ? el.href.split('/').pop() : null);
          return { id, name: el.innerText.split('\n')[0].trim() };
      })
      .filter(p => p.id && p.id.length > 20);
  });

  const uniquePatients = Array.from(new Map(patients.map(p => [p.id, p])).values()).slice(0, 10);

  for (const p of uniquePatients) {
    console.log(`📦 Evoluindo ${p.name}...`);
    await page.evaluate(async ({ pid, token }) => {
      const headers = { 
        'Authorization': `Bearer ${token.replace(/"/g, '')}`,
        'Content-Type': 'application/json'
      };

      for (let i = 1; i <= 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (10 - i));
        const ext = 90 + (i * 3.5);
        const flex = 45 + (i * 7);
        const pain = 8 - i >= 1 ? 8 - i : 1;

        await fetch('/api/v2/evolution/treatment-sessions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            patient_id: pid,
            session_date: date.toISOString(),
            objective: `SESSÃO #${i}: Mobilização articular precoce. ADM: ${ext.toFixed(0)}°/${flex.toFixed(0)}°. Dor: ${pain}/10.`,
            assessment: 'Melhora constante.',
            plan: 'Manter.'
          })
        });
      }
    }, { pid: p.id, token });
  }

  await browser.close();
  console.log('✨ SUCESSO!');
})();
