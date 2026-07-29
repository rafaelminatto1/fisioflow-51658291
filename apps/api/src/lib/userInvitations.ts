/**
 * Convites de acesso (user_invitations).
 *
 * Um convite pendente define o papel com que o perfil é criado no signup
 * (webhook `user.created`), dispensando aprovação manual em /admin.
 */

// Mesmo valor de DEFAULT_ORG_ID em lib/auth.ts — duplicado aqui para não
// arrastar o módulo de auth (e o driver pg) para dentro deste caminho.
const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

// Espelha a allowlist de POST /profile/admin/approve/:profileId
const ALLOWED_INVITE_ROLES = [
  "admin",
  "fisioterapeuta",
  "estagiario",
  "paciente",
  "parceiro",
  "recepcionista",
];

interface QueryablePool {
  query(sql: string, params?: unknown[]): Promise<{ rows?: any[]; rowCount?: number | null }>;
}

export interface InvitedRole {
  invitationId: string;
  role: string;
  roles: string[];
  organizationId: string;
}

export async function resolveInvitedRole(
  pool: QueryablePool,
  email: string | null | undefined,
): Promise<InvitedRole | null> {
  const normalizedEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) return null;

  try {
    const res = await pool.query(
      `SELECT id, role, organization_id
         FROM user_invitations
        WHERE lower(email) = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1`,
      [normalizedEmail],
    );

    const row = res.rows?.[0];
    if (!row) return null;

    const role = String(row.role ?? "")
      .trim()
      .toLowerCase();
    if (!ALLOWED_INVITE_ROLES.includes(role)) {
      console.warn(`[Invitations] Papel fora da allowlist ignorado: ${role}`);
      return null;
    }

    return {
      invitationId: row.id,
      role,
      roles: [role],
      organizationId: row.organization_id ?? DEFAULT_ORGANIZATION_ID,
    };
  } catch (err: any) {
    // Falha aqui não deve impedir o signup — o perfil cai no fluxo 'pending'.
    console.error("[Invitations] Erro ao resolver convite:", err?.message);
    return null;
  }
}

export async function markInvitationUsed(
  pool: QueryablePool,
  invitationId: string,
): Promise<void> {
  try {
    await pool.query(`UPDATE user_invitations SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`, [
      invitationId,
    ]);
  } catch (err: any) {
    console.error("[Invitations] Erro ao marcar convite como usado:", err?.message);
  }
}
