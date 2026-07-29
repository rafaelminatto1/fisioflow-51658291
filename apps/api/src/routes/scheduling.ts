import { Hono } from "hono";
import type { Env } from "../types/env";
import type { AuthVariables } from "../lib/auth";
import { settingsRoutes } from "./scheduling-settings";
import { recurringRoutes } from "./scheduling-recurring";
import { appointmentWaitlistRoutes } from "./appointment-waitlist";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.route("/settings", settingsRoutes);
app.route("/recurring", recurringRoutes);
app.route("/appointment-waitlist", appointmentWaitlistRoutes);

export { app as schedulingRoutes };
