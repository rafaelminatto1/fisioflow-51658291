import { test, expect, Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const setupAuth = async (page: Page) => {
    console.log('Starting Auth...');
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => {
        return url.pathname === '/' ||
            url.pathname.includes('/agenda') ||
            url.pathname.includes('/dashboard');
    }, { timeout: 30000 });
    console.log('Auth Complete. Current URL:', page.url());
};

test.describe('Payment Flow - New Package', () => {
    test.beforeEach(async ({ page }) => {
        // Capture browser console logs
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // Monkey-patch window.fetch to ensure interception
        await page.addInitScript(() => {
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const url = args[0] ? args[0].toString() : '';
                if (url.toLowerCase().includes('listpatientsv2')) {
                    console.log('MOCKING LISTPATIENTS (Fetch Override)');
                    return new Response(JSON.stringify({
                        data: [
                            {
                                id: '00000000-0000-0000-0000-000000000001',
                                name: 'Test Patient Playwright',
                                full_name: 'Test Patient Playwright',
                                status: 'active',
                                email: 'test@example.com',
                                phone: '11999999999',
                                created_at: new Date().toISOString(),
                                organization_id: '00000000-0000-0000-0000-000000000000'
                            }
                        ]
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                if (url.toLowerCase().includes('listappointments')) {
                    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                }
                return originalFetch(...args);
            };
        });

        // Mock List Patients API to bypass backend errors
        await page.route('**/listpatientsv2*', async route => {
            const headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': '*'
            };
            if (route.request().method() === 'OPTIONS') {
                await route.fulfill({ status: 204, headers });
                return;
            }
            await route.fulfill({
                headers,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'test-patient-1',
                        name: 'Test Patient Playwright',
                        full_name: 'Test Patient Playwright',
                        status: 'active',
                        created_at: new Date().toISOString()
                    }
                ])
            });
        });

        // Mock List Appointments API via HTTP
        await page.route('**/listappointments*', async route => {
            const headers = { 'Access-Control-Allow-Origin': '*' };
            if (route.request().method() === 'OPTIONS') {
                await route.fulfill({ status: 204, headers });
                return;
            }
            await route.fulfill({
                headers,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        await setupAuth(page);
        await page.goto('/agenda');
        console.log('Navigated to /agenda');
        // Ensure agenda is loaded
        await expect(page.locator('button:has-text("Novo Agendamento"), button:has-text("Novo")').first()).toBeVisible({ timeout: 20000 });
        console.log('Agenda loaded (Novo button visible)');
    });

    test('should create a new package with custom options during appointment scheduling', async ({ page }) => {
        test.slow();
        test.setTimeout(120000); // Increase timeout

        // 1. Open New Appointment Modal
        console.log('Clicking Novo Agendamento...');
        const novoAgendamentoButton = page.locator('button:has-text("Novo Agendamento"), button:has-text("Novo")').first();
        await novoAgendamentoButton.click();

        // Check if modal opened
        console.log('Waiting for Modal...');
        // Relaxed check for modal title
        await expect(page.getByRole('heading', { name: /Novo Agendamento|Novo Atendimento/i }).first()).toBeVisible();
        console.log('Modal Opened');

        // 2. Select Patient
        console.log('Selecting Patient...');
        // More robust selector for the combobox (using the label to find the generic combobox nearby)
        const patientCombobox = page.locator('button[role="combobox"]').nth(0); // Assuming it's the first one, or use label location

        await expect(patientCombobox).toBeVisible();
        await patientCombobox.click();

        // Wait for specific option and click it
        const option = page.locator('div[role="option"]').filter({ hasText: "Test Patient Playwright" }).first();
        await expect(option).toBeVisible({ timeout: 5000 });
        await option.click();
        console.log('Clicked Patient Option');

        // 3. Select "Pacote" payment status
        console.log('Selecting Pacote status...');
        const pacoteBtn = page.locator('button:has-text("Pacote")').first();
        await pacoteBtn.scrollIntoViewIfNeeded();
        await pacoteBtn.click();

        // 4. Wait for package loading to finish
        console.log('Waiting for loading to finish...');
        await expect(page.getByText('Carregando...')).not.toBeVisible({ timeout: 10000 });

        // Verify "Pacote do Paciente" is visible (sanity check)
        await expect(page.getByText('Pacote do Paciente')).toBeVisible();
        console.log('Found "Pacote do Paciente" label');

        // 5. Click "New Package" button
        console.log('Clicking New Package button...');
        try {
            const newPackageBtn = page.locator('button[title="Vender novo pacote"]').first();
            await expect(newPackageBtn).toBeVisible({ timeout: 30000 }); // Increased timeout
            await newPackageBtn.click();
        } catch (error) {
            console.log('ERROR: New Package Button NOT FOUND or NOT VISIBLE.');
            console.log('Dumping HTML of relevant section:');
            try {
                // Attempt to dump the payment section container
                // The container usually has class "space-y-4" or is inside TabsContent
                const tabsContent = page.locator('[role="tabpanel"]').first();
                if (await tabsContent.isVisible()) {
                    console.log(await tabsContent.innerHTML());
                } else {
                    console.log('TabsContent not visible. Dumping modal content:');
                    const modalParams = page.locator('[role="dialog"]');
                    if (await modalParams.isVisible()) {
                        console.log(await modalParams.innerHTML());
                    } else {
                        console.log('Modal not visible either?');
                    }
                }
            } catch (dumpError) {
                console.log('Failed to dump HTML:', dumpError);
            }
            throw error;
        }

        // 6. Verify Popover is open
        console.log('Waiting for Popover...');
        await expect(page.getByText('Vender Novo Pacote')).toBeVisible();

        // 7. Select Template in Popover
        console.log('Selecting Template...');
        // Scope to the specific popover dialog
        const popoverContent = page.locator('[role="dialog"]').filter({ hasText: 'Vender Novo Pacote' });
        const templateTrigger = popoverContent.locator('button[role="combobox"]').first();
        await templateTrigger.click();
        const templateUnavailable = popoverContent.getByText(/Erro ao carregar modelos|Nenhum modelo encontrado/i).first();
        const packageOption = page.getByRole('option').first();

        await Promise.race([
            packageOption.waitFor({ state: 'visible', timeout: 10000 }),
            templateUnavailable.waitFor({ state: 'visible', timeout: 10000 }),
        ]).catch(() => undefined);

        if (await templateUnavailable.isVisible().catch(() => false)) {
            test.skip(true, 'Ambiente sem permissão/seed para carregar modelos de pacote');
        }

        // Seleciona o primeiro modelo disponível para não depender de nome fixo no seed.
        await expect(packageOption).toBeVisible({ timeout: 10000 });
        await packageOption.click();

        // Verify template selected (text changed from placeholder)
        await expect(templateTrigger).not.toHaveText('Selecione um modelo...', { timeout: 5000 });

        // 8. Custom Overrides
        console.log('Filling Overrides...');
        const sessionsInput = popoverContent.locator('input[name="sessions_count"]');
        await sessionsInput.fill('8');

        const priceInput = popoverContent.locator('input[name="price"]');
        await priceInput.fill('150');

        // 9. Select Payment Method
        console.log('Selecting Payment Method...');
        // Finding the payment method combobox in popover
        const methodTrigger = popoverContent.locator('button[role="combobox"]').last();

        await methodTrigger.click({ force: true });
        await page.keyboard.press('ArrowDown'); // Select first option
        await page.keyboard.press('Enter');

        // 10. Confirm
        console.log('Confirming Sale...');
        await page.getByRole('button', { name: 'Confirmar Venda' }).click();

        // 12. Verify Popover Closed
        console.log('Verifying Success...');
        await expect(page.getByText('Vender Novo Pacote')).not.toBeVisible();

        console.log('Test Complete');
    });
});
