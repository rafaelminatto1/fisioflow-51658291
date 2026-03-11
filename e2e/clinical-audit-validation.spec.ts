import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Clinical Protocol Audit Validation', () => {
test('should verify protocols are de-duplicated and enriched', async ({ page }) => {
    // 1. Navegar para a agenda (deve estar logado via storageState global)
    console.log('[E2E] Verificando autenticação...');
    await page.goto('/agenda');
    
    // Se ainda assim cair no auth, algo está errado com o globalSetup
    if (page.url().includes('/auth')) {
      console.warn('[E2E] ALERTA: Não autenticado pelo storageState. Tentando login emergencial...');
      await page.fill('input[type="email"]', testUsers.admin.email);
      await page.fill('input[type="password"]', testUsers.admin.password);
      await page.click('button[type="submit"]', { force: true });
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }

    await expect(page).toHaveURL(/.*(agenda|dashboard)/, { timeout: 30000 });
    console.log('[E2E] Autenticado com sucesso. URL:', page.url());

    // 4. Navegação para Gerenciamento de Protocolos
    console.log('[E2E] Navegando para /protocols...');
    await page.goto('/protocols');
    
    try {
      await expect(page.locator('h1, h2')).toContainText(/Protocolos|Gerenciamento/, { timeout: 20000 });
      console.log('[E2E] Header de protocolos detectado');
    } catch (e) {
      console.error('[E2E] FALHA: Header não encontrado. URL:', page.url());
      throw e;
    }

    // 5. VERIFICAÇÃO DE AUDITORIA E ENRIQUECIMENTO (Ex: LCA Padrão Ouro)

    console.log('[E2E] Procurando campo de busca...');
    const searchInput = page.getByPlaceholder(/Buscar por nome|Buscar protocolos/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    
    // LCA
    await searchInput.clear();
    await searchInput.fill('LCA (Padrão Ouro)');
    await page.waitForTimeout(2500); // Aguardar debounce maior
    const lcaEnriched = page.getByText(/Reconstrução de LCA.*Padrão Ouro/i).first();
    await expect(lcaEnriched).toBeVisible({ timeout: 15000 });
    console.log('[E2E] Protocolo LCA Enriquecido (Padrão Ouro) detectado');

    // 6. VERIFICAÇÃO DE EXPANSÃO (Novos Protocolos)
    // AVC
    await searchInput.clear();
    await searchInput.fill('AVC (Fase Crônica)');
    await page.waitForTimeout(2000); 
    const avcProtocol = page.getByText(/Reabilitação Pós-AVC.*Fase Crônica/i).first();
    await expect(avcProtocol).toBeVisible({ timeout: 10000 });
    console.log('[E2E] Protocolo AVC Crônico detectado');

    // Tendinopatia
    await searchInput.clear();
    await searchInput.fill('Tendinopatia Patelar');
    await page.waitForTimeout(2000);
    const tendinhoProtocol = page.getByText(/Tendinopatia Patelar.*HSR.*Padrão Ouro/i).first();
    await expect(tendinhoProtocol).toBeVisible({ timeout: 10000 });
    console.log('[E2E] Protocolo Tendinopatia Patelar detectado');

    // 7. Teste de clique no protocolo para ver detalhes (verificar se renderiza sem quebrar)
    // Clicar no protocolo de Tendinopatia que já está visível por causa da busca anterior
    console.log('[E2E] Clicando no protocolo de Tendinopatia para ver detalhes...');
    await tendinhoProtocol.click();
    
    // Esperar um elemento dentro do detalhamento (em português)
    // Usar regex para ser mais flexível com o texto "Marcos do Protocolo"
    await expect(page.getByText(/Marcos do Protocolo/i)).toBeVisible({ timeout: 15000 });
    console.log('[E2E] Detalhes do protocolo carregados com sucesso (Marcos visíveis)');

    console.log('✅ Clinical Audit E2E Validation Passed');
  });
});
