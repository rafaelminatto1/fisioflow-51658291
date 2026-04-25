import { test, expect } from '@playwright/test';

test.describe('Validação de Produção - MediaPipe', () => {
  test('deve carregar ativos do MediaPipe sem erro 404', async ({ page }) => {
    const errors: string[] = [];
    const failedRequests: string[] = [];

    // Capturar erros do console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[Console Error] ${msg.text()}`);
        errors.push(msg.text());
      }
    });

    // Capturar falhas de rede
    page.on('requestfailed', request => {
      console.log(`[Network Failed] ${request.url()} - ${request.failure()?.errorText}`);
      failedRequests.push(request.url());
    });

    // Capturar respostas com erro (4xx, 5xx)
    page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        console.log(`[HTTP Error] ${status} - ${response.url()}`);
        if (response.url().includes('mediapipe')) {
          failedRequests.push(`${status}: ${response.url()}`);
        }
      }
    });

    // Acessar a URL de produção (baseada no config do playwright ou env)
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://fisioflow-professional.web.app';
    console.log(`[Test] Acessando ${baseUrl}`);

    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    // Aguardar um pouco para garantir que o pré-carregamento disparou
    console.log('[Test] Aguardando inicialização do pré-carregamento...');
    await page.waitForTimeout(5000);

    // Verificar se houve algum erro 404 para o MediaPipe
    const mediapipeErrors = failedRequests.filter(req => req.includes('mediapipe'));

    expect(mediapipeErrors, `Encontrados erros de carregamento no MediaPipe: ${mediapipeErrors.join(', ')}`).toHaveLength(0);

    // Verificar especificamente a versão problematica 0.10.22 no log de rede (não deve existir)
    const hasWrongVersion = failedRequests.some(req => req.includes('0.10.22'));
    expect(hasWrongVersion, 'A aplicação ainda está tentando carregar a versão antiga 0.10.22').toBe(false);

    console.log('✅ Validação concluída: Nenhum erro 404 detectado para o MediaPipe.');
  });
});
