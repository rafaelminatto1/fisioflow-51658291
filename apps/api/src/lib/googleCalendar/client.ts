import type { Env } from "../../types/env";
import type { GoogleCalendarEvent } from "./mapEvent";

/** Troca o refresh_token por um access_token novo. */
export async function refreshAccessToken(env: Env, refreshToken: string): Promise<string | null> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !refreshToken) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/** Cria um evento no Google Calendar. Retorna o id do evento criado. */
export async function insertCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: GoogleCalendarEvent,
): Promise<{ id: string } > {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    },
  );
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(`Google Calendar insert falhou: ${res.status} — ${detail}`);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id };
}
