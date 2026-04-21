/**
 * Gamification Routes — Neon PostgreSQL
 *
 * GET    /api/gamification/profile/:patientId          — perfil (cria se não existir, checa streak)
 * POST   /api/gamification/award-xp                    — concede XP + atualiza perfil
 * GET    /api/gamification/quests/:patientId           — missões do dia (gera se não existir)
 * PUT    /api/gamification/quests/:patientId/complete  — completa missão + concede XP
 * GET    /api/gamification/achievements/:patientId     — conquistas (todas + desbloqueadas)
 * GET    /api/gamification/transactions/:patientId     — transações XP recentes (10 últimas)
 * GET    /api/gamification/shop                        — itens da loja
 * GET    /api/gamification/inventory/:patientId        — inventário do usuário
 * POST   /api/gamification/buy                         — compra item
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── Level helpers ────────────────────────────────────────────────────────────

const LEVEL_BASE_XP = 1000;
const LEVEL_MULTIPLIER = 1.2;

const parseJsonField = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

function calculateLevel(totalXp: number) {
  let level = 1;
  let xpForNextLevel = LEVEL_BASE_XP;
  let accumulated = 0;
  while (totalXp >= accumulated + xpForNextLevel) {
    accumulated += xpForNextLevel;
    level++;
    xpForNextLevel = Math.floor(xpForNextLevel * LEVEL_MULTIPLIER);
  }
  return { level, xpForNextLevel, currentLevelXp: totalXp - accumulated };
}

// Helper para obter patient_id do usuário logado (se for paciente)
async function getPatientIdFromUser(c: any, pool: any): Promise<string | null> {
  const user = c.get('user');
  if (!user?.uid) return null;
  
  const result = await pool.query(
    'SELECT id FROM patients WHERE user_id = $1 OR email = $2 LIMIT 1',
    [user.uid, user.email]
  );
  return result.rows[0]?.id || null;
}

// ─── GET /profile ────────────────────────────────────────────────────────────
app.get('/profile', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const patientId = await getPatientIdFromUser(c, pool);
  if (!patientId) return c.json({ data: null, error: 'Paciente não encontrado' }, 404);

  // Reutiliza a lógica do perfil
  let result = await pool.query(
    'SELECT * FROM patient_gamification WHERE patient_id = $1',
    [patientId],
  );

  if (!result.rows.length) {
    result = await pool.query(
      `INSERT INTO patient_gamification
         (patient_id, current_xp, level, current_streak, longest_streak,
          total_points, last_activity_date, created_at, updated_at)
       VALUES ($1, 0, 1, 0, 0, 0, NULL, NOW(), NOW())
       RETURNING *`,
      [patientId],
    );
  }
  return c.json({ data: result.rows[0] });
});

// ─── GET /profile/:patientId ─────────────────────────────────────────────────

app.get('/profile/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const pool = createPool(c.env);

  const patientExists = await pool.query('SELECT 1 FROM patients WHERE id = $1', [patientId]);
  if (!patientExists.rows.length) {
    return c.json({ data: null, message: 'Paciente não encontrado' });
  }

  let result = await pool.query(
    'SELECT * FROM patient_gamification WHERE patient_id = $1',
    [patientId],
  );

  if (!result.rows.length) {
    result = await pool.query(
      `INSERT INTO patient_gamification
         (patient_id, current_xp, level, current_streak, longest_streak,
          total_points, last_activity_date, created_at, updated_at)
       VALUES ($1, 0, 1, 0, 0, 0, NULL, NOW(), NOW())
       RETURNING *`,
      [patientId],
    );
    return c.json({ data: result.rows[0] });
  }

  const profile = result.rows[0];

  if (profile.last_activity_date) {
    const lastDate = new Date(profile.last_activity_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);

    if (diffDays > 1) {
      const freezeResult = await pool.query(
        `SELECT * FROM user_inventory
         WHERE user_id = $1 AND item_code = 'streak_freeze' AND quantity > 0
         LIMIT 1`,
        [patientId],
      );

      if (freezeResult.rows.length) {
        const freeze = freezeResult.rows[0];
        const newQty = freeze.quantity - 1;
        if (newQty <= 0) {
          await pool.query('DELETE FROM user_inventory WHERE id = $1', [freeze.id]);
        } else {
          await pool.query(
            'UPDATE user_inventory SET quantity = $1, updated_at = NOW() WHERE id = $2',
            [newQty, freeze.id],
          );
        }
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await pool.query(
          'UPDATE patient_gamification SET last_activity_date = $1, updated_at = NOW() WHERE patient_id = $2',
          [yesterday.toISOString(), patientId],
        );
      } else {
        await pool.query(
          'UPDATE patient_gamification SET current_streak = 0, updated_at = NOW() WHERE patient_id = $1',
          [patientId],
        );
      }

      result = await pool.query(
        'SELECT * FROM patient_gamification WHERE patient_id = $1',
        [patientId],
      );
    }
  }

  return c.json({ data: result.rows[0] });
});

// ─── POST /award-xp ──────────────────────────────────────────────────────────

app.post('/award-xp', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as {
    patientId: string;
    amount: number;
    reason: string;
    description?: string;
  };

  const { patientId, amount, reason, description } = body;
  if (!patientId || !amount || !reason) {
    return c.json({ error: 'patientId, amount e reason são obrigatórios' }, 400);
  }

  // Get or create profile
  let profResult = await pool.query(
    'SELECT * FROM patient_gamification WHERE patient_id = $1',
    [patientId],
  );
  if (!profResult.rows.length) {
    profResult = await pool.query(
      `INSERT INTO patient_gamification
         (patient_id, current_xp, level, current_streak, longest_streak,
          total_points, last_activity_date, created_at, updated_at)
       VALUES ($1, 0, 1, 0, 0, 0, NOW(), NOW(), NOW())
       RETURNING *`,
      [patientId],
    );
  }

  const profile = profResult.rows[0];
  const newTotalPoints = (profile.total_points || 0) + amount;
  const { level } = calculateLevel(newTotalPoints);
  const leveledUp = level > (profile.level || 1);

  // Streak logic
  let newStreak = profile.current_streak || 0;
  let longestStreak = profile.longest_streak || 0;
  if (profile.last_activity_date) {
    const last = new Date(profile.last_activity_date);
    last.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - last.getTime()) / 86400000);
    if (diff === 1) {
      newStreak += 1;
    } else if (diff > 1) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }
  if (newStreak > longestStreak) longestStreak = newStreak;

  // Transaction: log + update profile atomically
  await pool.query(
    `INSERT INTO xp_transactions (patient_id, amount, reason, description, created_at, created_by)
     VALUES ($1, $2, $3, $4, NOW(), $5)`,
    [patientId, amount, reason, description ?? null, user.uid],
  );

  const updated = await pool.query(
    `UPDATE patient_gamification
     SET total_points = $1, current_xp = $1, level = $2,
         current_streak = $3, longest_streak = $4,
         last_activity_date = NOW(), updated_at = NOW()
     WHERE patient_id = $5
     RETURNING *`,
    [newTotalPoints, level, newStreak, longestStreak, patientId],
  );

  return c.json({
    data: updated.rows[0],
    leveledUp,
    newLevel: level,
    streakExtended: newStreak > (profile.current_streak || 0),
  });
});

// ─── GET /quests ─────────────────────────────────────────────────────────────
app.get('/quests', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const patientId = await getPatientIdFromUser(c, pool);
  if (!patientId) return c.json({ data: [] });
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query('SELECT * FROM daily_quests WHERE patient_id = $1 AND date = $2 LIMIT 1', [patientId, today]);
  return c.json({ data: result.rows[0] || [] });
});

// ─── GET /quests/:patientId ───────────────────────────────────────────────────

app.get('/quests/:patientId', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { patientId } = c.req.param();
  
  // Verify patient exists to avoid FK violations on later inserts
  const patientExists = await pool.query('SELECT 1 FROM patients WHERE id = $1', [patientId]);
  if (!patientExists.rows.length) {
    return c.json({ data: { quests: [], completed_count: 0 }, message: 'Paciente não encontrado' });
  }

  const today = new Date().toISOString().split('T')[0];

  const result = await pool.query(
    `SELECT * FROM daily_quests
     WHERE patient_id = $1 AND date = $2
     LIMIT 1`,
    [patientId, today],
  );

  if (result.rows.length) {
    return c.json({ data: result.rows[0] });
  }

  // Generate default quests for today
  const defaultQuests = [
    { id: crypto.randomUUID(), title: 'Realizar exercícios do protocolo', description: 'Complete os exercícios prescritos', xp: 50, completed: false, icon: '🏋️' },
    { id: crypto.randomUUID(), title: 'Registrar evolução da sessão', description: 'Documente sua sessão no sistema', xp: 30, completed: false, icon: '📝' },
    { id: crypto.randomUUID(), title: 'Atingir meta de passos', description: 'Caminhe pelo menos 30 minutos', xp: 20, completed: false, icon: '🚶' },
  ];

  const created = await pool.query(
    `INSERT INTO daily_quests (patient_id, date, quests_data, completed_count, created_at, updated_at)
     VALUES ($1, $2, $3, 0, NOW(), NOW())
     RETURNING *`,
    [patientId, today, JSON.stringify(defaultQuests)],
  );

  return c.json({ data: created.rows[0] });
});

// ─── PUT /quests/:patientId/complete ─────────────────────────────────────────

app.put('/quests/:patientId/complete', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { patientId } = c.req.param();
  const body = (await c.req.json()) as { questId: string };
  const today = new Date().toISOString().split('T')[0];

  const result = await pool.query(
    'SELECT * FROM daily_quests WHERE patient_id = $1 AND date = $2 LIMIT 1',
    [patientId, today],
  );

  if (!result.rows.length) return c.json({ error: 'Missões do dia não encontradas' }, 404);

  const record = result.rows[0];
  const quests: Array<{ id: string; completed: boolean; xp: number }> = record.quests_data ?? [];
  const quest = quests.find((q) => q.id === body.questId);

  if (!quest) return c.json({ error: 'Missão não encontrada' }, 404);
  if (quest.completed) return c.json({ data: record }); // idempotent

  const updatedQuests = quests.map((q) => (q.id === body.questId ? { ...q, completed: true } : q));
  const completedCount = updatedQuests.filter((q) => q.completed).length;

  await pool.query(
    `UPDATE daily_quests
     SET quests_data = $1, completed_count = $2, updated_at = NOW()
     WHERE id = $3`,
    [JSON.stringify(updatedQuests), completedCount, record.id],
  );

  return c.json({ data: { ...record, quests_data: updatedQuests, completed_count: completedCount }, xpAwarded: quest.xp });
});

// ─── GET /achievements ───────────────────────────────────────────────────────
app.get('/achievements', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const patientId = await getPatientIdFromUser(c, pool);
  if (!patientId) return c.json({ data: { all: [], unlocked: [] } });
  const [allResult, unlockedResult] = await Promise.all([
    pool.query('SELECT * FROM achievements ORDER BY xp_reward ASC'),
    pool.query('SELECT * FROM achievements_log WHERE patient_id = $1 ORDER BY unlocked_at DESC', [patientId]),
  ]);
  return c.json({ data: { all: allResult.rows, unlocked: unlockedResult.rows } });
});

// ─── GET /achievements/:patientId ────────────────────────────────────────────

app.get('/achievements/:patientId', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { patientId } = c.req.param();

  const [allResult, unlockedResult] = await Promise.all([
    pool.query('SELECT * FROM achievements ORDER BY xp_reward ASC'),
    pool.query(
      'SELECT * FROM achievements_log WHERE patient_id = $1 ORDER BY unlocked_at DESC',
      [patientId],
    ),
  ]);

  return c.json({ data: { all: allResult.rows, unlocked: unlockedResult.rows } });
});

// ─── GET /transactions/:patientId ────────────────────────────────────────────

app.get('/transactions/:patientId', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { patientId } = c.req.param();

  const result = await pool.query(
    `SELECT * FROM xp_transactions
     WHERE patient_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [patientId],
  );

  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.get('/transactions', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { days = '30', limit = '500' } = c.req.query();
  const daysNum = Math.min(365, Math.max(1, Number.parseInt(days, 10) || 30));
  const limitNum = Math.min(5000, Math.max(1, Number.parseInt(limit, 10) || 500));
  const startDate = new Date(Date.now() - daysNum * 86400000).toISOString();

  const result = await pool.query(
    `
      SELECT xt.*
      FROM xp_transactions xt
      JOIN patients p ON p.id = xt.patient_id
      WHERE p.organization_id = $1
        AND xt.created_at >= $2
      ORDER BY xt.created_at ASC
      LIMIT $3
    `,
    [user.organizationId, startDate, limitNum],
  );

  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

// ─── GET /leaderboard ────────────────────────────────────────────────────────

app.get('/leaderboard', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { period = 'all', limit = '50' } = c.req.query();
  const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50));

  const params: Array<string | number> = [user.organizationId];
  let where = 'WHERE p.organization_id = $1';
  let orderBy = 'pg.total_points DESC, pg.level DESC';

  if (period === 'weekly') {
    params.push(new Date(Date.now() - 7 * 86400000).toISOString());
    where += ` AND pg.last_activity_date >= $${params.length}`;
    orderBy = 'pg.current_streak DESC, pg.total_points DESC';
  } else if (period === 'monthly') {
    params.push(new Date(Date.now() - 30 * 86400000).toISOString());
    where += ` AND pg.last_activity_date >= $${params.length}`;
    orderBy = 'pg.current_streak DESC, pg.total_points DESC';
  }

  params.push(limitNum);

  const result = await pool.query(
    `
      SELECT
        pg.patient_id,
        COALESCE(NULLIF(p.full_name, ''), 'Paciente') AS patient_name,
        p.email,
        pg.level AS current_level,
        pg.total_points AS total_xp,
        pg.current_streak,
        pg.longest_streak,
        pg.last_activity_date
      FROM patient_gamification pg
      JOIN patients p ON p.id = pg.patient_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length}
    `,
    params,
  );

  return c.json({
    data: result.rows.map((row, index) => ({
      rank: index + 1,
      ...row,
      isCurrentUser: row.user_id === user.uid,
    })),
  });
});

app.get('/badges/:patientId', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { patientId } = c.req.param();

  const result = await pool.query(
    `SELECT a.icon, a.title, a.category, al.unlocked_at
     FROM achievements_log al
     JOIN achievements a ON a.id = al.achievement_id
     WHERE al.patient_id = $1
     ORDER BY al.unlocked_at DESC`,
    [patientId]
  );

  return c.json({ data: result.rows });
});

// ─── GET /shop ────────────────────────────────────────────────────────────────

app.get('/shop', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const result = await pool.query(
    'SELECT * FROM shop_items WHERE is_active = true ORDER BY cost ASC',
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

// ─── GET /inventory ─────────────────────────────────────────────────────────
app.get('/inventory', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const patientId = await getPatientIdFromUser(c, pool);
  if (!patientId) return c.json({ data: [] });
  const result = await pool.query(
    `SELECT ui.*, si.code as item_code_check, si.name as item_name, si.description as item_description,
            si.cost as item_cost, si.type as item_type, si.icon as item_icon
     FROM user_inventory ui
     JOIN shop_items si ON si.id = ui.item_id
     WHERE ui.user_id = $1`,
    [patientId],
  );
  return c.json({ data: result.rows });
});

// ─── GET /inventory/:patientId ───────────────────────────────────────────────

app.get('/inventory/:patientId', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { patientId } = c.req.param();

  const result = await pool.query(
    `SELECT ui.*, si.code as item_code_check, si.name as item_name, si.description as item_description,
            si.cost as item_cost, si.type as item_type, si.icon as item_icon
     FROM user_inventory ui
     JOIN shop_items si ON si.id = ui.item_id
     WHERE ui.user_id = $1`,
    [patientId],
  );

  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

// ─── POST /buy ────────────────────────────────────────────────────────────────

app.post('/buy', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as { patientId: string; itemId: string };
  const { patientId, itemId } = body;

  if (!patientId || !itemId) {
    return c.json({ error: 'patientId e itemId são obrigatórios' }, 400);
  }

  // Get item
  const itemResult = await pool.query(
    'SELECT * FROM shop_items WHERE id = $1 AND is_active = true',
    [itemId],
  );
  if (!itemResult.rows.length) return c.json({ error: 'Item não encontrado' }, 404);
  const item = itemResult.rows[0];

  // Get profile
  const profResult = await pool.query(
    'SELECT * FROM patient_gamification WHERE patient_id = $1',
    [patientId],
  );
  if (!profResult.rows.length) return c.json({ error: 'Perfil não encontrado' }, 404);
  const profile = profResult.rows[0];

  if ((profile.total_points || 0) < item.cost) {
    return c.json({ error: 'Pontos insuficientes' }, 400);
  }

  // Deduct points
  await pool.query(
    'UPDATE patient_gamification SET total_points = total_points - $1, updated_at = NOW() WHERE patient_id = $2',
    [item.cost, patientId],
  );

  // Upsert inventory (ON CONFLICT increments quantity)
  await pool.query(
    `INSERT INTO user_inventory (user_id, item_id, item_code, quantity, is_equipped, created_at, updated_at)
     VALUES ($1, $2, $3, 1, false, NOW(), NOW())
     ON CONFLICT (user_id, item_id)
     DO UPDATE SET quantity = user_inventory.quantity + 1, updated_at = NOW()`,
    [patientId, itemId, item.code],
  );

  const updatedProf = await pool.query(
    'SELECT * FROM patient_gamification WHERE patient_id = $1',
    [patientId],
  );

  return c.json({ data: updatedProf.rows[0] });
});

// ─── GET /settings ───────────────────────────────────────────────────────────

app.get('/settings', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const result = await pool.query(
    `SELECT id, key, value, description, updated_at
     FROM gamification_settings
     ORDER BY key ASC`,
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.put('/settings', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as { settings?: Record<string, unknown> };
  const entries = Object.entries(body.settings ?? {});

  if (!entries.length) {
    return c.json({ error: 'Nenhuma configuração enviada' }, 400);
  }

  const updated: unknown[] = [];
  for (const [key, value] of entries) {
    const result = await pool.query(
      `INSERT INTO gamification_settings (key, value, description, created_at, updated_at)
       VALUES ($1, $2, COALESCE((SELECT description FROM gamification_settings WHERE key = $1 LIMIT 1), $1), NOW(), NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING id, key, value, description, updated_at`,
      [key, typeof value === 'string' ? value : JSON.stringify(value)],
    );
    updated.push(result.rows[0]);
  }

  return c.json({ data: updated });
});

// ─── GET /admin/stats ────────────────────────────────────────────────────────

app.get('/admin/stats', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { days = '30' } = c.req.query();
  const daysNum = Math.min(365, Math.max(1, Number.parseInt(days, 10) || 30));
  const startDate = new Date(Date.now() - daysNum * 86400000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [profiles, xpRows, achievements, patientCount] = await Promise.all([
    pool.query(
      `SELECT pg.*
       FROM patient_gamification pg
       JOIN patients p ON p.id = pg.patient_id
       WHERE p.organization_id = $1`,
      [user.organizationId],
    ),
    pool.query(
      `SELECT xt.amount, xt.reason, xt.created_at, xt.patient_id
       FROM xp_transactions xt
       JOIN patients p ON p.id = xt.patient_id
       WHERE p.organization_id = $1
         AND xt.created_at >= $2`,
      [user.organizationId, startDate],
    ),
    pool.query(
      `SELECT al.id
       FROM achievements_log al
       JOIN patients p ON p.id = al.patient_id
       WHERE p.organization_id = $1
         AND al.unlocked_at >= $2`,
      [user.organizationId, startDate],
    ),
    pool.query('SELECT COUNT(*)::int AS total FROM patients WHERE organization_id = $1', [
      user.organizationId,
    ]),
  ]);

  const rows = profiles.rows;
  const totalPatients = patientCount.rows[0]?.total ?? rows.length;
  const activeLast30Days = rows.filter((row) => row.last_activity_date && row.last_activity_date >= startDate).length;
  const activeLast7Days = rows.filter((row) => row.last_activity_date && row.last_activity_date >= sevenDaysAgo).length;
  const atRiskPatients = rows.filter((row) => !row.last_activity_date || row.last_activity_date < sevenDaysAgo).length;
  const totalXpAwarded = xpRows.rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const averageLevel = rows.length ? rows.reduce((sum, row) => sum + (row.level ?? 0), 0) / rows.length : 0;
  const averageStreak = rows.length ? rows.reduce((sum, row) => sum + (row.current_streak ?? 0), 0) / rows.length : 0;
  const engagementRate = totalPatients > 0 ? (activeLast30Days / totalPatients) * 100 : 0;

  return c.json({
    data: {
      totalPatients,
      totalXpAwarded,
      averageLevel: Math.round(averageLevel * 10) / 10,
      averageStreak: Math.round(averageStreak * 10) / 10,
      activeLast30Days,
      activeLast7Days,
      achievementsUnlocked: achievements.rowCount,
      engagementRate: Math.round(engagementRate * 10) / 10,
      atRiskPatients,
    },
  });
});

app.get('/admin/at-risk', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { limit = '50', days = '7' } = c.req.query();
  const limitNum = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 50));
  const inactiveSince = new Date(Date.now() - (Number.parseInt(days, 10) || 7) * 86400000).toISOString();
  const result = await pool.query(
    `SELECT
        pg.patient_id,
        COALESCE(NULLIF(p.full_name, ''), 'Desconhecido') AS patient_name,
        p.email,
        pg.level,
        pg.last_activity_date AS "lastActivity"
     FROM patient_gamification pg
     JOIN patients p ON p.id = pg.patient_id
     WHERE p.organization_id = $1
       AND (pg.last_activity_date IS NULL OR pg.last_activity_date < $2)
     ORDER BY pg.last_activity_date ASC NULLS FIRST
     LIMIT $3`,
    [user.organizationId, inactiveSince, limitNum],
  );

  return c.json({
    data: result.rows.map((row) => ({
      ...row,
      daysInactive: row.lastActivity
        ? Math.floor((Date.now() - new Date(row.lastActivity).getTime()) / 86400000)
        : 999,
    })),
  });
});

app.get('/admin/popular-achievements', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { limit = '10' } = c.req.query();
  const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 10));

  const [data, total] = await Promise.all([
    pool.query(
      `SELECT
          a.id,
          a.title,
          COUNT(al.id)::int AS "unlockedCount"
       FROM achievements a
       LEFT JOIN achievements_log al ON al.achievement_id = a.id
       LEFT JOIN patients p ON p.id = al.patient_id
       WHERE p.organization_id = $1 OR p.organization_id IS NULL
       GROUP BY a.id, a.title
       ORDER BY COUNT(al.id) DESC, a.title ASC
       LIMIT $2`,
      [user.organizationId, limitNum],
    ),
    pool.query('SELECT COUNT(*)::int AS total FROM patients WHERE organization_id = $1', [
      user.organizationId,
    ]),
  ]);

  const totalPatients = total.rows[0]?.total ?? 1;
  return c.json({
    data: data.rows.map((row) => ({
      ...row,
      totalPatients,
      unlockRate: totalPatients > 0 ? (row.unlockedCount / totalPatients) * 100 : 0,
    })),
  });
});

app.post('/admin/adjust-xp', requireAuth, async (c) => {
  const body = (await c.req.json()) as { patientId: string; amount: number; reason: string };
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { patientId, amount, reason } = body;

  if (!patientId || !Number.isFinite(amount) || !reason?.trim()) {
    return c.json({ error: 'patientId, amount e reason são obrigatórios' }, 400);
  }

  let profResult = await pool.query(
    'SELECT * FROM patient_gamification WHERE patient_id = $1',
    [patientId],
  );
  if (!profResult.rows.length) {
    profResult = await pool.query(
      `INSERT INTO patient_gamification
         (patient_id, current_xp, level, current_streak, longest_streak,
          total_points, last_activity_date, created_at, updated_at)
       VALUES ($1, 0, 1, 0, 0, 0, NOW(), NOW(), NOW())
       RETURNING *`,
      [patientId],
    );
  }

  const current = profResult.rows[0];
  const newTotal = Math.max(0, (current.total_points ?? 0) + amount);
  const { level } = calculateLevel(newTotal);

  await pool.query(
    `INSERT INTO xp_transactions (patient_id, amount, reason, description, created_at, created_by)
     VALUES ($1, $2, 'manual_adjustment', $3, NOW(), $4)`,
    [patientId, amount, reason, user.uid],
  );

  const updated = await pool.query(
    `UPDATE patient_gamification
     SET total_points = $1, current_xp = $1, level = $2, updated_at = NOW()
     WHERE patient_id = $3
     RETURNING *`,
    [newTotal, level, patientId],
  );

  return c.json({ data: updated.rows[0] });
});

app.post('/admin/reset-streak', requireAuth, async (c) => {
  const body = (await c.req.json()) as { patientId: string };
  const pool = await createPool(c.env);
  if (!body.patientId) return c.json({ error: 'patientId é obrigatório' }, 400);
  const result = await pool.query(
    `UPDATE patient_gamification
     SET current_streak = 0, updated_at = NOW()
     WHERE patient_id = $1
     RETURNING *`,
    [body.patientId],
  );
  return c.json({ data: result.rows[0] ?? null });
});

// ─── CRUD /achievement-definitions ───────────────────────────────────────────

app.get('/achievement-definitions', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const result = await pool.query('SELECT * FROM achievements ORDER BY xp_reward ASC, title ASC');
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.post('/achievement-definitions', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `INSERT INTO achievements (code, title, description, xp_reward, icon, category, requirements, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      body.code,
      body.title,
      body.description ?? '',
      Number(body.xp_reward ?? 0),
      body.icon ?? null,
      body.category ?? 'general',
      JSON.stringify(body.requirements ?? {}),
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/achievement-definitions/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `UPDATE achievements
     SET code = COALESCE($2, code),
         title = COALESCE($3, title),
         description = COALESCE($4, description),
         xp_reward = COALESCE($5, xp_reward),
         icon = $6,
         category = COALESCE($7, category),
         requirements = COALESCE($8, requirements),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      body.code ?? null,
      body.title ?? null,
      body.description ?? null,
      body.xp_reward != null ? Number(body.xp_reward) : null,
      body.icon ?? null,
      body.category ?? null,
      body.requirements != null ? JSON.stringify(body.requirements) : null,
    ],
  );
  return c.json({ data: result.rows[0] ?? null });
});

app.delete('/achievement-definitions/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  await pool.query('DELETE FROM achievements WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ─── CRUD /quest-definitions ─────────────────────────────────────────────────

app.get('/quest-definitions', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const result = await pool.query('SELECT * FROM quest_definitions ORDER BY created_at DESC NULLS LAST, title ASC');
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.post('/quest-definitions', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `INSERT INTO quest_definitions
      (title, description, xp_reward, points_reward, icon, category, difficulty, is_active, repeat_interval, requirements, code, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true), $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      body.title,
      body.description ?? null,
      Number(body.xp_reward ?? 0),
      Number(body.points_reward ?? 0),
      body.icon ?? null,
      body.category ?? 'daily',
      body.difficulty ?? 'easy',
      body.is_active ?? true,
      body.repeat_interval ?? 'daily',
      JSON.stringify(body.requirements ?? {}),
      body.code ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/quest-definitions/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `UPDATE quest_definitions
     SET title = COALESCE($2, title),
         description = $3,
         xp_reward = COALESCE($4, xp_reward),
         points_reward = COALESCE($5, points_reward),
         icon = $6,
         category = COALESCE($7, category),
         difficulty = COALESCE($8, difficulty),
         is_active = COALESCE($9, is_active),
         repeat_interval = COALESCE($10, repeat_interval),
         requirements = COALESCE($11, requirements),
         code = COALESCE($12, code),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      body.title ?? null,
      body.description ?? null,
      body.xp_reward != null ? Number(body.xp_reward) : null,
      body.points_reward != null ? Number(body.points_reward) : null,
      body.icon ?? null,
      body.category ?? null,
      body.difficulty ?? null,
      body.is_active ?? null,
      body.repeat_interval ?? null,
      body.requirements != null ? JSON.stringify(body.requirements) : null,
      body.code ?? null,
    ],
  );
  return c.json({ data: result.rows[0] ?? null });
});

app.patch('/quest-definitions/:id/active', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as { is_active: boolean };
  const result = await pool.query(
    `UPDATE quest_definitions SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, body.is_active],
  );
  return c.json({ data: result.rows[0] ?? null });
});

app.delete('/quest-definitions/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  await pool.query('DELETE FROM quest_definitions WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ─── CRUD /weekly-challenges ─────────────────────────────────────────────────

app.get('/weekly-challenges', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { active, patientId } = c.req.query();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (active === 'true') {
    params.push(new Date().toISOString().split('T')[0]);
    conditions.push(`is_active = true AND start_date <= $${params.length} AND end_date >= $${params.length}`);
  }

  let query = 'SELECT * FROM weekly_challenges';
  if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY start_date DESC, created_at DESC NULLS LAST';

  const result = await pool.query(query, params);
  let rows = result.rows;

  if (patientId) {
    const progress = await pool.query(
      'SELECT * FROM patient_challenges WHERE patient_id = $1',
      [patientId],
    );
    const byId = new Map(progress.rows.map((row) => [row.challenge_id, row]));
    rows = rows.map((row) => ({
      ...row,
      target: parseJsonField(row.target, { type: 'sessions', count: 1 }),
      patient_progress: byId.get(row.id) ?? null,
    }));
  } else {
    rows = rows.map((row) => ({
      ...row,
      target: parseJsonField(row.target, { type: 'sessions', count: 1 }),
    }));
  }

  return c.json({ data: rows });
});

app.post('/weekly-challenges', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `INSERT INTO weekly_challenges
      (title, description, xp_reward, point_reward, start_date, end_date, target, icon, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, true), NOW(), NOW())
     RETURNING *`,
    [
      body.title,
      body.description ?? null,
      Number(body.xp_reward ?? 0),
      Number(body.point_reward ?? 0),
      body.start_date,
      body.end_date,
      JSON.stringify(body.target ?? {}),
      body.icon ?? null,
      body.is_active ?? true,
    ],
  );
  return c.json({ data: { ...result.rows[0], target: parseJsonField(result.rows[0]?.target, {}) } }, 201);
});

app.put('/weekly-challenges/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `UPDATE weekly_challenges
     SET title = COALESCE($2, title),
         description = $3,
         xp_reward = COALESCE($4, xp_reward),
         point_reward = COALESCE($5, point_reward),
         start_date = COALESCE($6, start_date),
         end_date = COALESCE($7, end_date),
         target = COALESCE($8, target),
         icon = $9,
         is_active = COALESCE($10, is_active),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      body.title ?? null,
      body.description ?? null,
      body.xp_reward != null ? Number(body.xp_reward) : null,
      body.point_reward != null ? Number(body.point_reward) : null,
      body.start_date ?? null,
      body.end_date ?? null,
      body.target != null ? JSON.stringify(body.target) : null,
      body.icon ?? null,
      body.is_active ?? null,
    ],
  );
  return c.json({ data: { ...result.rows[0], target: parseJsonField(result.rows[0]?.target, {}) } });
});

app.patch('/weekly-challenges/:id/active', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as { is_active: boolean };
  const result = await pool.query(
    'UPDATE weekly_challenges SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, body.is_active],
  );
  return c.json({ data: { ...result.rows[0], target: parseJsonField(result.rows[0]?.target, {}) } });
});

app.delete('/weekly-challenges/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  await pool.query('DELETE FROM weekly_challenges WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ─── GET /patient-challenges ────────────────────────────────────────────────
app.get('/patient-challenges', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const patientId = await getPatientIdFromUser(c, pool);
  if (!patientId) return c.json({ data: [] });
  const result = await pool.query(
    `SELECT * FROM patient_challenges WHERE patient_id = $1 ORDER BY completed DESC, completed_at DESC NULLS LAST`,
    [patientId],
  );
  return c.json({ data: result.rows });
});

app.get('/patient-challenges/:patientId', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { patientId } = c.req.param();
  const result = await pool.query(
    `SELECT * FROM patient_challenges WHERE patient_id = $1 ORDER BY completed DESC, completed_at DESC NULLS LAST`,
    [patientId],
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

// ─── CRUD /shop-items ────────────────────────────────────────────────────────

app.get('/shop-items', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const result = await pool.query('SELECT * FROM shop_items ORDER BY created_at DESC NULLS LAST, cost ASC');
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.post('/shop-items', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `INSERT INTO shop_items (code, name, description, cost, type, icon, metadata, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true), NOW(), NOW())
     RETURNING *`,
    [
      body.code ?? null,
      body.name,
      body.description ?? '',
      Number(body.cost ?? 0),
      body.type ?? 'consumable',
      body.icon ?? null,
      JSON.stringify(body.metadata ?? {}),
      body.is_active ?? true,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/shop-items/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `UPDATE shop_items
     SET code = COALESCE($2, code),
         name = COALESCE($3, name),
         description = COALESCE($4, description),
         cost = COALESCE($5, cost),
         type = COALESCE($6, type),
         icon = $7,
         metadata = COALESCE($8, metadata),
         is_active = COALESCE($9, is_active),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      body.code ?? null,
      body.name ?? null,
      body.description ?? null,
      body.cost != null ? Number(body.cost) : null,
      body.type ?? null,
      body.icon ?? null,
      body.metadata != null ? JSON.stringify(body.metadata) : null,
      body.is_active ?? null,
    ],
  );
  return c.json({ data: result.rows[0] ?? null });
});

app.delete('/shop-items/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  await pool.query('DELETE FROM shop_items WHERE id = $1', [id]);
  return c.json({ ok: true });
});

export { app as gamificationRoutes };
