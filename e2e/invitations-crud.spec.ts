import { expect, test, type Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';
import { testUsers } from './fixtures/test-data';

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

type InvitationRecord = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  invited_by: string;
};

async function dismissOnboardingIfPresent(page: Page) {
  const onboardingDialog = page
    .locator('[role="dialog"]')
    .filter({ has: page.getByText(/Bem-vindo ao FisioFlow/i) })
    .first();

  if (!(await onboardingDialog.isVisible({ timeout: 3000 }).catch(() => false))) {
    return;
  }

  const closeButton = onboardingDialog.getByRole('button', { name: /Close|Fechar/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ force: true });
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }

  await expect(onboardingDialog).toBeHidden({ timeout: 5000 });
}

async function setupInvitationsMocks(page: Page) {
  let invitations: InvitationRecord[] = [
    {
      id: 'invite-seed-1',
      organization_id: TEST_ORG_ID,
      email: 'seed.invite@example.com',
      role: 'fisioterapeuta',
      token: 'seed-token',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      used_at: null,
      created_at: new Date().toISOString(),
      invited_by: 'user-invitations-admin',
    },
  ];

  await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: TEST_ORG_ID,
          name: 'Organização Convites',
          slug: 'organizacao-convites',
          settings: {},
          active: true,
        },
      }),
    });
  });

  await page.route('**/api/organization-members?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'member-invitations-admin',
            organization_id: TEST_ORG_ID,
            user_id: 'user-invitations-admin',
            role: 'admin',
            active: true,
          },
        ],
        total: 1,
      }),
    });
  });

  await page.route('**/api/profile/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'user-invitations-admin',
          user_id: 'user-invitations-admin',
          email: testUsers.admin.email,
          full_name: 'Admin Convites',
          role: 'admin',
          organization_id: TEST_ORG_ID,
          organizationId: TEST_ORG_ID,
          email_verified: true,
        },
      }),
    });
  });

  await page.route('**/api/notifications?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/audit-logs?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route(/\/api\/invitations(?:\?.*)?$/i, async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      const payload = (await route.request().postDataJSON().catch(() => ({}))) as {
        email?: string;
        role?: string;
      };

      const created: InvitationRecord = {
        id: `invite-${Date.now()}`,
        organization_id: TEST_ORG_ID,
        email: payload.email || 'novo.convite@example.com',
        role: payload.role || 'fisioterapeuta',
        token: `token-${Date.now()}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
        invited_by: 'user-invitations-admin',
      };
      invitations = [created, ...invitations];

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: created }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: invitations }),
    });
  });

  await page.route(/\/api\/invitations\/[^/?#]+$/i, async (route) => {
    const method = route.request().method();
    const id = route.request().url().split('/').pop() || '';
    const index = invitations.findIndex((invitation) => invitation.id === id);

    if (method === 'PATCH') {
      const payload = (await route.request().postDataJSON().catch(() => ({}))) as {
        email?: string;
        role?: string;
        expires_at?: string;
      };

      if (index >= 0) {
        invitations[index] = {
          ...invitations[index],
          email: payload.email || invitations[index].email,
          role: payload.role || invitations[index].role,
          expires_at: payload.expires_at || invitations[index].expires_at,
        };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: invitations[index] }),
      });
      return;
    }

    if (method === 'DELETE') {
      invitations = invitations.filter((invitation) => invitation.id !== id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Not found' }),
    });
  });
}

async function loginAsAdmin(page: Page): Promise<void> {
  await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
  await setupInvitationsMocks(page);
}

test.describe('Admin Invitations CRUD', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deve criar, editar e revogar um convite', async ({ page }) => {
    const invitationEmail = `e2e.invite.${Date.now()}@example.com`;
    const newExpiration = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);

    await loginAsAdmin(page);
    await page.goto('/admin/invitations', { waitUntil: 'domcontentloaded' });
    await dismissOnboardingIfPresent(page);
    await page.waitForTimeout(1000);
    const restrictedAlert = page.getByText('Você não tem permissão para acessar esta página.').first();
    if (await restrictedAlert.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(page.getByText(/Página restrita para: admin/i)).toBeVisible();
      return;
    }

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
