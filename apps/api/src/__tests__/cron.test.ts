import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPool: vi.fn(),
  runHealthMonitor: vi.fn(),
  isWithinBusinessHours: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  createPool: mocks.createPool,
}));

vi.mock("../lib/businessHours", () => ({
  isWithinBusinessHours: mocks.isWithinBusinessHours,
}));

vi.mock("../lib/monitor", () => ({
  runHealthMonitor: mocks.runHealthMonitor,
}));

vi.mock("../lib/inngest-client", () => ({
  triggerInngestEvent: vi.fn(),
}));

vi.mock("../lib/email", () => ({
  sendAppointmentReminderEmail: vi.fn(),
}));

const { handleScheduled } = await import("../cron");

function makeScheduledEvent(cron: string): ScheduledEvent {
  return { cron } as ScheduledEvent;
}

describe("handleScheduled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createPool.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) });
    mocks.runHealthMonitor.mockResolvedValue(undefined);
    mocks.isWithinBusinessHours.mockReturnValue(true);
  });

  it("runs lightweight health monitor without creating a database pool", async () => {
    await handleScheduled(makeScheduledEvent("*/5 * * * *"), {} as any, {} as ExecutionContext);

    expect(mocks.runHealthMonitor).toHaveBeenCalledTimes(1);
    expect(mocks.createPool).not.toHaveBeenCalled();
  });

  it("does not create WikiSyncWorkflow manually — delegated to wrangler schedules", async () => {
    const create = vi.fn().mockResolvedValue(undefined);

    await handleScheduled(
      makeScheduledEvent("0 10 * * *"),
      { WORKFLOW_WIKI_SYNC: { create } } as any,
      {} as ExecutionContext,
    );

    expect(create).not.toHaveBeenCalled();
    // createPool is called for prewarmDatabase
    expect(mocks.createPool).toHaveBeenCalledTimes(1);
  });
  it("does not create KnowledgeSyncWorkflow manually — delegated to wrangler schedules", async () => {
    const create = vi.fn().mockResolvedValue(undefined);

    await handleScheduled(
      makeScheduledEvent("10 10 * * 1"),
      { WORKFLOW_KNOWLEDGE_SYNC: { create } } as any,
      {} as ExecutionContext,
    );

    expect(create).not.toHaveBeenCalled();
    expect(mocks.createPool).not.toHaveBeenCalled();
  });

  it("*/15 fora do expediente não toca o banco (Neon dorme)", async () => {
    mocks.isWithinBusinessHours.mockReturnValue(false);
    await handleScheduled(makeScheduledEvent("*/15 * * * *"), {} as any, {} as ExecutionContext);
    expect(mocks.createPool).not.toHaveBeenCalled();
  });

  it("*/15 dentro do expediente executa (cria pool)", async () => {
    mocks.isWithinBusinessHours.mockReturnValue(true);
    await handleScheduled(makeScheduledEvent("*/15 * * * *"), {} as any, {} as ExecutionContext);
    expect(mocks.createPool).toHaveBeenCalled();
  });

  it("warm-up 6:30 (30 9 * * 1-6) acorda o banco com SELECT 1", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    mocks.createPool.mockReturnValue({ query });
    await handleScheduled(makeScheduledEvent("30 9 * * 1-6"), {} as any, {} as ExecutionContext);
    expect(mocks.createPool).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });
});
