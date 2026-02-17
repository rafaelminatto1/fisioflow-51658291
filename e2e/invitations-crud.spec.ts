import { expect, test, type Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

async function loginAsAdmin(page: Page): Promise<void> {
  const email = process.env.E2E_ADMIN_EMAIL || process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;

  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 45000 }),
    page.getByRole('button', { name: /Entrar na Plataforma|Entrar/i }).first().click(),
  ]);
}

test.describe('Admin Invitations CRUD', () => {
  test('deve criar, editar e revogar um convite', async ({ page }) => {
    const invitationEmail = `e2e.invite.${Date.now()}@example.com`;
    const newExpiration = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);

    await loginAsAdmin(page);
    await page.goto('/admin/invitations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Gerenciamento de Convites' })).toBeVisible();

    await page.getByRole('button', { name: 'Novo Convite' }).click();
    const createDialog = page.getByRole('dialog', { name: 'Novo Convite' });
    await expect(createDialog).toBeVisible();
    await createDialog.locator('#new-invite-email').fill(invitationEmail);
    await createDialog.locator('#new-invite-role').click();
    await page.getByRole('option', { name: 'Estagiário' }).click();
    await Promise.all([
      expect(createDialog).not.toBeVisible(),
      createDialog.getByRole('button', { name: 'Criar Convite' }).click(),
    ]);

    const row = page.locator('tbody tr', { hasText: invitationEmail });
    await expect(row).toBeVisible({ timeout: 20000 });

    await row.getByRole('button', { name: 'Editar' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Editar Convite' });
    await expect(editDialog).toBeVisible();
    await editDialog.locator('#edit-invite-role').click();
    await page.getByRole('option', { name: 'Admin' }).click();
    await editDialog.locator('#edit-invite-expiration').fill(newExpiration);
    await Promise.all([
      expect(editDialog).not.toBeVisible(),
      editDialog.getByRole('button', { name: 'Salvar Alterações' }).click(),
    ]);
    await expect(row).toContainText('Admin', { timeout: 20000 });

    await row.getByRole('button', { name: /Revogar|Excluir/ }).click();
    const deleteDialog = page.getByRole('alertdialog');
    await expect(deleteDialog).toContainText(/Revogar convite pendente\?|Excluir convite\?/);
    await deleteDialog.getByRole('button', { name: 'Confirmar' }).click();
    await expect(row).toHaveCount(0, { timeout: 20000 });
  });
});
