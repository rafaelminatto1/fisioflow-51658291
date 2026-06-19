import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { rateLimit } from "../middleware/rateLimit";
import type { Env } from "../types/env";

import { aiChatRoutes } from "./ai/ai-chat";
import { aiAudioRoutes } from "./ai/ai-audio";
import { aiDocumentRoutes } from "./ai/ai-documents";
import { aiClinicalRoutes } from "./ai/ai-clinical";
import { aiInsightsRoutes } from "./ai/ai-insights";
import { aiBrainInsightsRoutes } from "./ai/brain-insights";
import { aiBrainChatRoutes } from "./ai/brain-chat";
import { aiRetentionRoutes } from "./ai/retention";
import { aiDictationRoutes } from "./ai/aiDictation";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Rate limiting: 100 chamadas AI por org por hora
app.use("*", requireAuth, rateLimit({ endpoint: "ai", limit: 100, windowSeconds: 3600 }));

// Mount sub-routes
app.route("/", aiChatRoutes);
app.route("/", aiAudioRoutes);
app.route("/", aiDocumentRoutes);
app.route("/", aiClinicalRoutes);
app.route("/insights", aiInsightsRoutes);
app.route("/brain/insights", aiBrainInsightsRoutes);
app.route("/brain/chat", aiBrainChatRoutes);
app.route("/retention", aiRetentionRoutes);
app.route("/", aiDictationRoutes);

export { app as aiRoutes };
