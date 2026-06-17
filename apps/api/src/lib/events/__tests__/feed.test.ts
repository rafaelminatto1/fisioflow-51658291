import { describe, it, expect } from "vitest";
import { mergeFeed } from "../feed";

describe("mergeFeed", () => {
  it("merges automation + calendar logs sorted by date desc", () => {
    const feed = mergeFeed(
      [
        { automation_name: "Parabéns", status: "completed", event_type: "evolution.updated", created_at: "2026-06-17T10:00:00Z" },
        { automation_name: "Recall", status: "triggered", created_at: "2026-06-17T08:00:00Z" },
      ],
      [{ message: "Evento enviado ao Calendar", status: "success", created_at: "2026-06-17T09:00:00Z" }],
    );
    expect(feed.map((f) => f.at)).toEqual([
      "2026-06-17T10:00:00Z",
      "2026-06-17T09:00:00Z",
      "2026-06-17T08:00:00Z",
    ]);
    expect(feed[0]).toMatchObject({ kind: "automation", title: "Parabéns", status: "completed" });
    expect(feed[1]).toMatchObject({ kind: "calendar", title: "Evento enviado ao Calendar" });
  });

  it("falls back to event_type/title and drops dateless rows; caps at limit", () => {
    const feed = mergeFeed(
      [
        { event_type: "appointment.created", status: "completed", created_at: "2026-06-17T10:00:00Z" },
        { automation_name: "x", status: "ok" }, // sem created_at → descartado
      ],
      [],
      1,
    );
    expect(feed).toHaveLength(1);
    expect(feed[0].title).toBe("appointment.created");
  });
});
