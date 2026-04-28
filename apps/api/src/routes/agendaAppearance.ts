/**
 * Agenda Appearance Routes
 *
 * GET  /agenda-appearance  — fetch the user's appearance profile
 * PUT  /agenda-appearance  — upsert the user's appearance profile
 *
 * Registered under /api/v1/user in apps/api/src/index.ts
 * Requirements: 3.1, 3.2, 3.8
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { type AuthVariables, requireAuth } from "../lib/auth";
import { createPool } from "../lib/db";
import type { Env } from "../types/env";

// ─── Zod Schema (Zod 4.x) ────────────────────────────────────────────────────

const CardSizeSchema = z.enum(["extra_small", "small", "medium", "large"]);

const AgendaViewAppearanceSchema = z.object({
  cardSize: CardSizeSchema,
  /** 0..10 */
  heightScale: z.number(),
  /** 0..10 */
  fontScale: z.number(),
  /** 0..100 */
  opacity: z.number(),
});

const PartialAgendaViewAppearanceSchema = AgendaViewAppearanceSchema.partial();

export const AgendaAppearanceStateSchema = z.object({
  global: AgendaViewAppearanceSchema,
  day: PartialAgendaViewAppearanceSchema.optional(),
  week: PartialAgendaViewAppearanceSchema.optional(),
  month: PartialAgendaViewAppearanceSchema.optional(),
});

export type AgendaAppearanceState = z.infer<typeof AgendaAppearanceStateSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampViewAppearance(
  view: z.infer<typeof PartialAgendaViewAppearanceSchema>,
): z.infer<typeof PartialAgendaViewAppearanceSchema> {
  const result: z.infer<typeof PartialAgendaViewAppearanceSchema> = { ...view };
  if (result.heightScale !== undefined) {
    result.heightScale = clamp(result.heightScale, 0, 10);
  }
  if (result.fontScale !== undefined) {
    result.fontScale = clamp(result.fontScale, 0, 10);
  }
  if (result.opacity !== undefined) {
    result.opacity = clamp(result.opacity, 0, 100);
  }
  return result;
}

function clampAppearanceState(state: AgendaAppearanceState): AgendaAppearanceState {
  return {
    global: {
      ...state.global,
      heightScale: clamp(state.global.heightScale, 0, 10),
      fontScale: clamp(state.global.fontScale, 0, 10),
      opacity: clamp(state.global.opacity, 0, 100),
    },
    day: state.day ? clampViewAppearance(state.day) : undefined,
    week: state.week ? clampViewAppearance(state.week) : undefined,
    month: state.month ? clampViewAppearance(state.month) : undefined,
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/v1/user/agenda-appearance
 *
 * Returns the stored appearance profile for the authenticated user.
 * Returns { data: null } with 200 when no profile exists yet (new user).
 */
app.get("/agenda-appearance", requireAuth, async (c) => {
  const user = c.get("user");
  // profileId may be undefined for brand-new users; fall back to uid
  const profileId = user.profileId ?? user.uid;
  const { organizationId } = user;

  const pool = createPool(c.env);

  try {
    const result = await pool.query<{ appearance_data: AgendaAppearanceState }>(
      `
        SELECT appearance_data
        FROM user_agenda_appearance
        WHERE profile_id = $1
          AND organization_id = $2
        LIMIT 1
      `,
      [profileId, organizationId],
    );

    if (!result.rows.length) {
      return c.json({ data: null }, 200);
    }

    return c.json({ data: result.rows[0].appearance_data }, 200);
  } catch (error) {
    console.error("[AgendaAppearance/GET] error:", error);
    return c.json({ error: "Erro ao buscar configurações de aparência." }, 500);
  }
});

/**
 * PUT /api/v1/user/agenda-appearance
 *
 * Upserts the appearance profile for the authenticated user.
 * Values out of range are clamped before persisting.
 * Returns { data: { updatedAt } } with 200 on success.
 */
app.put(
  "/agenda-appearance",
  requireAuth,
  zValidator("json", AgendaAppearanceStateSchema),
  async (c) => {
    const user = c.get("user");
    const profileId = user.profileId ?? user.uid;
    const { organizationId } = user;

    const rawBody = c.req.valid("json");
    const appearanceData = clampAppearanceState(rawBody);

    const pool = createPool(c.env);

    try {
      const result = await pool.query<{ updated_at: string }>(
        `
          INSERT INTO user_agenda_appearance (profile_id, organization_id, appearance_data, created_at, updated_at)
          VALUES ($1, $2, $3::jsonb, NOW(), NOW())
          ON CONFLICT (profile_id, organization_id)
          DO UPDATE SET
            appearance_data = $3::jsonb,
            updated_at = NOW()
          RETURNING updated_at
        `,
        [profileId, organizationId, JSON.stringify(appearanceData)],
      );

      const updatedAt = result.rows[0]?.updated_at ?? new Date().toISOString();

      return c.json({ data: { updatedAt } }, 200);
    } catch (error) {
      console.error("[AgendaAppearance/PUT] error:", error);
      return c.json({ error: "Erro ao salvar configurações de aparência." }, 500);
    }
  },
);

export { app as agendaAppearanceRoutes };
