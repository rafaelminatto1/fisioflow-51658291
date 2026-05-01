import { Hono } from "hono";
import type { Env } from "../types/env";
import type { AuthVariables } from "../lib/auth";
import { waitlistRoutes } from "./scheduling-waitlist";
import { settingsRoutes } from "./scheduling-settings";
import { recurringRoutes } from "./scheduling-recurring";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.route("/", waitlistRoutes);
app.route("/", settingsRoutes);
app.route("/", recurringRoutes);

export { app as schedulingRoutes };
