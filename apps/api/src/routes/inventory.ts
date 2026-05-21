import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/inventory/status
 * Retorna o status do estoque e alertas de reposição.
 */
app.get("/status", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `SELECT
        id,
        item_name        AS name,
        current_quantity AS current_stock,
        minimum_quantity AS min_stock,
        unit,
        CASE WHEN current_quantity <= minimum_quantity THEN true ELSE false END AS needs_replenishment
       FROM clinic_inventory
       WHERE organization_id = $1 AND is_active = true
       ORDER BY needs_replenishment DESC, item_name ASC`,
      [user.organizationId],
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Inventory] Error fetching status:", error);
    return c.json({ error: "Failed to fetch inventory status" }, 500);
  }
});

export { app as inventoryRoutes };
