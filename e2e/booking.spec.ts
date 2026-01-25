import { test, expect } from '@playwright/test';

const LOGIN_EMAIL = 'rafael.minatto@yahoo.com.br';
const LOGIN_PASSWORD = 'Yukari30@';

test.describe('Public Booking Flow', () => {
    let publicSlug = '';

    test.beforeAll(async ({ browser }) => {
        // 1. Setup Phase: Login and get/set the public slug
        const page = await browser.newPage();
        console.log('Setting up: Logging in to retrieve public slug...');

        await page.goto('/auth/login');
        await page.fill('input[type="email"]', LOGIN_EMAIL);
        await page.fill('input[type="password"]', LOGIN_PASSWORD);
        await page.locator('button[type="submit"]').click();

        // Wait for login to complete
        await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 15000 });

        // Go to profile
        await page.goto('/profile');

        // Wait for slug input
        const slugInput = page.locator('input#slug');
        const nameInput = page.locator('input#name');
        await slugInput.waitFor({ state: 'visible', timeout: 10000 });

        let slugValue = await slugInput.inputValue();
        let nameValue = await nameInput.inputValue();

        // Check if we need to update profile (either slug or name is missing/empty)
        if (!slugValue || !nameValue) {
            console.log('Profile incomplete (slug or name missing), updating...');

            // Click 'Editar Perfil' to enable inputs
            const editButton = page.locator('button:has-text("Editar Perfil")');
            await editButton.click();
            await expect(slugInput).toBeEnabled();

            if (!slugValue) {
                const newSlug = `test-physio-${Math.floor(Math.random() * 10000)}`;
                await slugInput.fill(newSlug);
                slugValue = newSlug;
            }

            if (!nameValue) {
                await nameInput.fill('Fisioterapeuta Teste');
            }

            await page.locator('button:has-text("Salvar Alterações")').click();

            // Wait for toast title specifically
            await expect(page.locator("div:text('Perfil atualizado!')").first()).toBeVisible();

            // Wait for propagation
            await page.waitForTimeout(2000);
        }

        publicSlug = slugValue;
        console.log(`Using Public Slug: ${publicSlug}`);

        await page.close();
    });

    test('should allow a patient to book an appointment', async ({ page }) => {
        test.skip(!publicSlug, 'Could not retrieve public slug, skipping test.');

        console.log(`Visiting booking page: /agendar/${publicSlug}`);
        await page.goto(`/agendar/${publicSlug}`);

        // Verify Profile Loaded
        await expect(page.locator('h2').first()).not.toBeEmpty();

        // Step 1: Select Date
        await expect(page.locator('h3:has-text("Escolha um horário")')).toBeVisible({ timeout: 10000 });

        // The calendar renders a table
        await expect(page.locator('table')).toBeVisible();

        // Selector for enabled day buttons in the calendar table
        const daySelector = 'table button:not([disabled]):not([aria-disabled="true"])';

        const availableDay = page.locator(daySelector).first();
        const count = await availableDay.count();

        if (count > 0) {
            console.log('Found available day in current month');
            await availableDay.click();
        } else {
            console.log('No days available in current view, checking next month...');
            const nextBtn = page.locator('button:has(svg.lucide-chevron-right)');
            if (await nextBtn.isVisible()) {
                await nextBtn.click();
                await page.waitForTimeout(1000);

                const nextMonthDay = page.locator(daySelector).first();
                if (await nextMonthDay.count() > 0) {
                    await nextMonthDay.click();
                } else {
                    throw new Error('No available days found in next month either.');
                }
            } else {
                console.log('Cannot find next month button');
            }
        }

        // Wait for times
        await expect(page.locator('h3:has-text("Horários Disponíveis")')).toBeVisible();

        const timeSlot = page.locator('button:has-text(":")').first();
        await expect(timeSlot).toBeVisible();
        await timeSlot.click();

        // Continue
        await page.click('button:has-text("Continuar")');

        // Step 2: Patient Info
        // Strict mode compliant
        await expect(page.getByRole('heading', { name: 'Seus Dados' })).toBeVisible();

        await page.fill('input#name', 'Paciente Teste Automático');
        await page.fill('input#phone', '11999999999');
        await page.fill('input#email', 'paciente.teste@example.com');
        await page.fill('textarea#notes', 'Teste automatizado de agendamento.');

        // Confirm
        await page.click('button:has-text("Confirmar Agendamento")');

        // Step 3: Success
        // Strict mode compliant
        await expect(page.getByRole('heading', { name: 'Solicitação Enviada!' })).toBeVisible({ timeout: 20000 });
        console.log('Booking confirmed successfully!');
    });
});
