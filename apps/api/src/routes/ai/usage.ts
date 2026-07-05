import { Hono } from "hono";
// import { db } from "@fisioflow/db";
// import { aiUsageEvents } from "@fisioflow/db/schema";
// import { eq, sum } from "drizzle-orm";

const app = new Hono<{ Bindings: any }>();

// Rota: GET /api/ai/usage/today
app.get("/usage/today", async (c) => {
  // const today = new Date().toISOString().split('T')[0];
  // const usage = await db.select({ total: sum(aiUsageEvents.estimatedCostBrl) }).from(aiUsageEvents).where(...);
  return c.json({ totalBrl: 15.50, limit: 50.00 });
});

// Rota: GET /api/ai/usage/month
app.get("/usage/month", async (c) => {
  return c.json({ totalBrl: 150.00, limit: 500.00 });
});

// Rota: GET /api/ai/usage/by-task
app.get("/usage/by-task", async (c) => {
  return c.json([
    { taskType: "clinical_reasoning", costBrl: 50.00 },
    { taskType: "soap_draft", costBrl: 100.00 }
  ]);
});

export default app;
