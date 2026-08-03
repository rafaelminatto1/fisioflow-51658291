import type { Env } from "../../types/env";
import type { EmailMessage } from "./types";
import { sendViaResend } from "./transports";

export async function sendEmail(env: Env, message: EmailMessage): Promise<boolean> {
  return sendViaResend(env, message);
}
