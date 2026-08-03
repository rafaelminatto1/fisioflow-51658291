import type { Env } from "../types/env";

export interface LogEvent {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  [key: string]: any;
}

export function redactPII(data: any): any {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(redactPII);

  const sensitiveKeys = [
    "cpf",
    "phone",
    "email",
    "patientName",
    "fullName",
    "patientId",
    "name",
    "password",
  ];
  const redacted = { ...data };

  for (const key in redacted) {
    if (sensitiveKeys.includes(key) && redacted[key]) {
      redacted[key] = "[REDACTED]";
    } else if (typeof redacted[key] === "object") {
      redacted[key] = redactPII(redacted[key]);
    }
  }
  return redacted;
}

export async function logEvent(env: Env, _ctx: ExecutionContext, data: LogEvent) {
  console.log(
    JSON.stringify({
      _time: new Date().toISOString(),
      environment: env.ENVIRONMENT || "production",
      ...redactPII(data),
    }),
  );
}
