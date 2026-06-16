import type { Env } from "../../types/env";
import type { AuthUser } from "../auth";
import { createResend } from "../email";
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

  const resend = createResend(env);
  if (!resend) return false;

  const briefing = await getBriefing(env, { organizationId: orgId } as AuthUser);
  const { subject, html } = formatBriefingEmail(briefing);
  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL ?? "FisioFlow <noreply@moocafisio.com.br>",
    to,
    subject,
    html,
  });
  return true;
}
