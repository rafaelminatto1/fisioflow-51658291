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
        id, name, current_stock, min_stock, unit,
        CASE WHEN current_stock <= min_stock THEN true ELSE false END as needs_replenishment
       FROM inventory_items
       WHERE organization_id = $1 AND deleted_at IS NULL
       ORDER BY needs_replenishment DESC, name ASC`,
      [user.organizationId],
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Inventory] Error fetching status:", error);
    return c.json({ error: "Failed to fetch inventory status" }, 500);
  }
});

export { app as inventoryRoutes };
