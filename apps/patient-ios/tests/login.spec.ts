import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
        // Navigate to the app
        await page.goto('/');

        // Wait for splash screen to hide and content to load
        // The login screen should be visible
        await expect(page.getByText('FisioFlow', { exact: true })).toBeVisible({ timeout: 15000 });

        // Fill the login form using placeholders
        await page.getByPlaceholder('seu@email.com').fill('rafael.minatto@yahoo.com.br');
        await page.getByPlaceholder('••••••••').fill('Yukari30@');

        // Click the login button
        await page.getByRole('button', { name: 'Entrar' }).click();

        // Verify successful login by checking for a tab bar item or specific home screen text
        // Assuming the home screen has "Próximos Exercícios" or something similar
        await expect(page.getByText('Sua evolução')).toBeVisible({ timeout: 15000 });

        // Check if we are in the progress screen or home screen
        // According to login.tsx it redirects to '/(tabs)'
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/');

        await page.getByPlaceholder('seu@email.com').fill('wrong@email.com');
        await page.getByPlaceholder('••••••••').fill('wrongpassword');

        await page.getByRole('button', { name: 'Entrar' }).click();

        // Check for error toast or message
        // The login function should throw and be caught
        await expect(page.getByText('Falha ao fazer login')).toBeVisible();
    });
});
