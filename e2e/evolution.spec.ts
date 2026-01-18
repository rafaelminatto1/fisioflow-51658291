
import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Evolução SOAP (Mocked)', () => {
    test.beforeEach(async ({ page }) => {
        // Debug Logging
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err));
        page.on('request', req => console.log('>> ' + req.method() + ' ' + req.url()));
        page.on('response', res => {
            if (res.status() >= 400) console.log('<< ERROR ' + res.status() + ' ' + res.url());
        });

        // 1. Generic Catch-all mocks (Last resort)
        await page.route('**/rest/v1/**', async route => route.fulfill({ json: [] }));
        await page.route('**/auth/v1/**', async route => route.fulfill({ json: {} }));
        await page.route('**/functions/v1/**', async route => route.fulfill({ json: { message: 'mock' } }));

        // Mock Data
        const mockPatient = {
            id: 'patient-123',
            name: 'Paciente Mock',
            email: 'mock@teste.com'
        };

        const mockAppointment = {
            id: 'appt-123',
            patient_id: 'patient-123',
            organization_id: 'org-123',
            start_time: '2024-01-01T10:00:00',
            end_time: '2024-01-01T11:00:00',
            status: 'agendado',
            patients: mockPatient
        };

        // 2. Specific Mocks (Override generics)
        await page.route('**/rest/v1/appointments*', async route => {
            const method = route.request().method();
            const url = route.request().url();

            if (method === 'PATCH') {
                await route.fulfill({ json: { ...mockAppointment, status: 'Realizado' } });
                return;
            }

            if (method === 'GET' || method === 'HEAD') {
                if (url.includes('id=eq.appt-123')) {
                    await route.fulfill({ json: mockAppointment });
                } else {
                    await route.fulfill({
                        json: [mockAppointment],
                        headers: { 'content-range': '0-0/1' }
                    });
                }
            } else {
                await route.continue();
            }
        });

        await page.route('**/rest/v1/patients*', async route => {
            await route.fulfill({ json: mockPatient });
        });

        // Profiles
        await page.route('**/rest/v1/profiles*', async route => {
            await route.fulfill({ json: { id: testUsers.admin.email, role: 'admin', full_name: 'Admin Tester' } });
        });

        // Organizations
        await page.route('**/rest/v1/organizations*', async route => route.fulfill({ json: [{ id: 'org-123', name: 'Org Mock' }] }));
        await page.route('**/rest/v1/organization_members*', async route => route.fulfill({ json: [{ organization_id: 'org-123', role: 'admin' }] }));

        // Login (navigation only, requests mocked)
        await page.goto('/auth');
        // We might need to mock the login call specifically if it uses Supabase Auth SDK which calls /auth/v1/token
        // But the previous run showed login worked (or at least navigated away).
        // If we mock auth, we might bypass real auth logic?
        // The test fills inputs and clicks submit.
        // If we mock /auth/v1/token to return success, then we are good.
        await page.fill('input[type="email"]', testUsers.admin.email);
        await page.fill('input[type="password"]', testUsers.admin.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/);
    });

    test('deve carregar dados do agendamento e salvar evolução', async ({ page }) => {
        // Navegar direto para a URL de evolução com ID mockado
        await page.goto('/session-evolution/appt-123');

        // Verificar carregamento
        await expect(page.locator('text=Evolução de Sessão')).toBeVisible({ timeout: 10000 });

        // Preencher SOAP
        await page.fill('textarea[name="subjective"], textarea[placeholder*="Subjetivo"]', 'Paciente relata dor nível 2.');
        await page.fill('textarea[name="objective"], textarea[placeholder*="Objetivo"]', 'Exercícios de fortalecimento realizados.');
        await page.fill('textarea[name="assessment"], textarea[placeholder*="Avaliação"]', 'Melhora consistente.');
        await page.fill('textarea[name="plan"], textarea[placeholder*="Plano"]', 'Manter plano.');

        // Salvar
        await page.click('button:has-text("Salvar Evolução")');

        // Verificar feedback de sucesso
        await expect(page.locator('text=Evolução salva')).toBeVisible();
    });
});
