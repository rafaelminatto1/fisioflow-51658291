import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Evolução SOAP (Mocked)', () => {
    test.beforeEach(async ({ page }) => {
        // Debug setup
        page.on('console', msg => {
            if (!msg.text().includes('[vite]')) console.log('BROWSER LOG:', msg.text());
        });
        page.on('pageerror', err => console.log('BROWSER ERROR:', err));
        page.on('response', resp => {
            if (resp.status() >= 400 && resp.status() !== 401) { // 401 might happen for non-essential assets
                console.log(`RESPONSE ERROR ${resp.status()}:`, resp.url());
            }
        });

        // --- CONSTANTS ---
        const validUserId = '123e4567-e89b-12d3-a456-426614174000';
        const validPatientId = '123e4567-e89b-12d3-a456-426614174001';
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';
        const validOrgId = '123e4567-e89b-12d3-a456-426614174003';

        // --- MOCKS SETUP ---
        await page.route('**/rest/v1/**', async route => {
            await route.fulfill({ json: [] });
        });
        await page.route('**/functions/v1/**', async route => {
            await route.fulfill({ json: { message: 'ok' } });
        });

        // Auth Mocks
        const mockUser = {
            id: validUserId,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'admin@test.com',
            app_metadata: { provider: 'email' },
            user_metadata: { full_name: 'Admin Tester' },
            created_at: new Date().toISOString(),
        };

        const mockSession = {
            access_token: 'fake-jwt-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'fake-refresh-token',
            user: mockUser
        };

        await page.route('**/auth/v1/token?*', async route => route.fulfill({ json: mockSession }));
        await page.route('**/auth/v1/user*', async route => route.fulfill({ json: mockUser }));

        // Data Mocks
        const mockPatient = {
            id: validPatientId,
            name: 'Paciente Mock',
            email: 'mock@teste.com'
        };

        const mockAppointment = {
            id: validApptId,
            patient_id: validPatientId,
            patientId: validPatientId,
            organization_id: validOrgId,
            organizationId: validOrgId,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(),
            appointment_date: new Date().toISOString().slice(0, 10),
            appointment_time: '10:00',
            status: 'agendado',
            notes: JSON.stringify({ soap: {}, exercises: [] }),
            patients: mockPatient,
            patient: mockPatient,
        };

        // API Routes
        await page.route('**/rest/v1/appointments*', async route => {
            const method = route.request().method();
            const url = route.request().url();

            if (method === 'PATCH') {
                await route.fulfill({ json: [{ ...mockAppointment, status: 'Realizado' }] });
                return;
            }

            if (method === 'GET' || method === 'HEAD') {
                if (url.includes(`id=eq.${validApptId}`)) {
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

        await page.route(/appointmentservicehttp/i, async route => {
            const req = route.request();
            const method = req.method();
            if (method !== 'POST') {
                await route.fulfill({ status: 200, json: { data: mockAppointment } });
                return;
            }

            let body: Record<string, unknown> = {};
            try {
                body = req.postDataJSON() as Record<string, unknown>;
            } catch {
                body = {};
            }

            const action = String(body.action || '');
            if (action === 'get') {
                await route.fulfill({ status: 200, json: { data: mockAppointment } });
                return;
            }

            if (action === 'list') {
                await route.fulfill({ status: 200, json: { data: [mockAppointment], total: 1 } });
                return;
            }

            await route.fulfill({ status: 200, json: { data: { ...mockAppointment, status: 'Realizado' } } });
        });

        await page.route('**/getpatienthttp**', async route => {
            await route.fulfill({ status: 200, json: { data: mockPatient } });
        });

        await page.route('**/patientservicehttp**', async route => {
            await route.fulfill({ status: 200, json: { data: [mockPatient], total: 1 } });
        });

        await page.route('**/getprofile**', async route => {
            await route.fulfill({ status: 200, json: { data: { id: validUserId, organization_id: validOrgId, role: 'admin', full_name: 'Admin Tester' } } });
        });

        await page.route('**/rest/v1/patients*', async route => {
            await route.fulfill({ json: mockPatient });
        });

        await page.route('**/rest/v1/profiles*', async route => {
            await route.fulfill({ json: { id: validUserId, organization_id: validOrgId, role: 'admin', full_name: 'Admin Tester' } });
        });

        await page.route('**/rest/v1/organizations*', async route => route.fulfill({ json: [{ id: validOrgId, name: 'Org Mock' }] }));
        await page.route('**/rest/v1/organization_members*', async route => route.fulfill({ json: [{ organization_id: validOrgId, role: 'admin' }] }));

        // SOAP RECORDS MOCK
        await page.route('**/rest/v1/soap_records*', async route => {
            console.log('MOCK SOAP RECORD HIT:', route.request().method(), route.request().url());
            if (route.request().method() === 'POST') {
                const body = route.request().postDataJSON();
                console.log('MOCK POST BODY:', JSON.stringify(body));
                await route.fulfill({
                    status: 201,
                    json: [{ id: 'soap-new-1', ...body }]
                });
            } else {
                await route.fulfill({ json: [] });
            }
        });

        // Ancillary Tables
        const ancillaryTables = [
            'patient_surgeries', 'patient_pathologies', 'patient_goals',
            'mandatory_tests', 'patient_test_exceptions', 'treatment_sessions'
        ];
        for (const table of ancillaryTables) {
            await page.route(`**/rest/v1/${table}*`, async route => route.fulfill({ json: [] }));
        }

        // Navigation
        await page.goto('/auth');
        await page.fill('input[name="email"]', testUsers.admin.email);
        await page.fill('input[name="password"]', testUsers.admin.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/);
    });

    test('deve carregar dados do agendamento e salvar evolução', async ({ page }) => {
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';
        await page.goto(`/patient-evolution/${validApptId}`);

        await expect(page.locator('.lucide-loader-2')).toBeHidden({ timeout: 15000 });
        await expect(page.getByRole('heading', { name: /Subjetivo/i }).first()).toBeVisible({ timeout: 10000 });

        // Fill SOAP fields (current UI exposes them as textboxes)
        await page.getByRole('textbox', { name: /Campo SOAP: Subjetivo/i }).fill('Teste Subjetivo');
        await page.getByRole('textbox', { name: /Campo SOAP: Avaliação/i }).fill('Teste Avaliação');
        await page.getByRole('textbox', { name: /Campo SOAP: Plano/i }).fill('Teste Plano');

        // Click Save
        const saveButtons = page.locator('button', { hasText: /^Salvar$/i });
        const count = await saveButtons.count();
        // Removed console.log

        if (count === 0) throw new Error('Botão Salvar Evolução não encontrado!');

        if (count < 2) { /* Removed console.warn */ }

        // Removed console.log
        await saveButtons.last().click({ force: true });

        // Wait for potential toast
        await page.waitForTimeout(1000);

        try {
            await expect(page.getByText(/salv/i).first()).toBeVisible({ timeout: 10000 });
        } catch (e) {
            // Removed console.error
            // Dump all toasts
            const toasts = page.locator('[role="status"], .toast, [data-sonner-toast]');
            const toastCount = await toasts.count();
            if (toastCount > 0) {
                for (let i = 0; i < toastCount; i++) {
                    // Removed console.error
                }
            } else {
                // Removed console.error
            }

            // Dump body start
            const bodyText = await page.textContent('body');
            // Removed console.error

            throw e;
        }
    });
});
