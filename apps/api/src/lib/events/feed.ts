export type FeedItem = {
  kind: "automation" | "calendar";
  title: string;
  status: string;
  at: string;
};

type Row = Record<string, unknown>;

/** Une logs de automação e de sync do Calendar num feed único, ordenado por data desc. */
export function mergeFeed(automationRows: Row[], calendarRows: Row[], limit = 50): FeedItem[] {
  const a: FeedItem[] = (automationRows ?? []).map((r) => ({
    kind: "automation",
    title: String(r.automation_name || r.event_type || "Automação"),
    status: String(r.status ?? ""),
    at: String(r.created_at ?? ""),
  }));
  const g: FeedItem[] = (calendarRows ?? []).map((r) => ({
    kind: "calendar",
    title: String(r.message || "Sincronização Google Calendar"),
    status: String(r.status ?? ""),
    at: String(r.created_at ?? ""),
  }));
  return [...a, ...g]
    .filter((x) => x.at)
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .slice(0, limit);
}
