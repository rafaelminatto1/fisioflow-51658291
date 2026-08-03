import type { Env } from "../../types/env";
import type { AuthUser } from "../auth";
import { sendEmail } from "../email/dispatch";
import { getBriefing } from "../../routes/briefing";
import { formatBriefingEmail } from "./formatBriefingEmail";

/**
 * Dispatches the daily Morning Briefing by email. Gated: only runs when
 * MORNING_BRIEFING_ENABLED === "true" and MORNING_BRIEFING_TO/ORG_ID are set.
 * Returns true if an email was sent.
 */
export async function dispatchMorningBriefing(env: Env): Promise<boolean> {
  if (env.MORNING_BRIEFING_ENABLED !== "true") return false;
  const to = env.MORNING_BRIEFING_TO;
  const orgId = env.MORNING_BRIEFING_ORG_ID;
  if (!to || !orgId) return false;

  const briefing = await getBriefing(env, { organizationId: orgId } as AuthUser);
  const { subject, html } = formatBriefingEmail(briefing);
  return sendEmail(env, { to, subject, html });
}
