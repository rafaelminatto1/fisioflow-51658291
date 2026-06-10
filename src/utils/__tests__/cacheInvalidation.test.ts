import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { invalidateAppointmentsComprehensive } from "../cacheInvalidation";

const SCHEDULE_KEY = ["schedule-appointments", "2026-06-10", "week", [], [], [], undefined];

describe("invalidateAppointmentsComprehensive", () => {
  let queryClient: QueryClient;

  afterEach(() => {
    queryClient?.clear();
  });

  async function seedScheduleQuery(data: Array<{ id: string }>) {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    let fetchCount = 0;
    await queryClient.fetchQuery({
      queryKey: SCHEDULE_KEY,
      queryFn: async () => {
        fetchCount += 1;
        return data;
      },
    });
    return () => fetchCount;
  }

  it("nunca apaga os dados da agenda durante a invalidação (sem reset → sem flicker)", async () => {
    const data = [{ id: "appt-1" }];
    await seedScheduleQuery(data);

    // O flicker do drag-drop acontece quando os dados da query viram undefined
    // no meio da invalidação (resetQueries): appointments cai para [] e o
    // Schedule.tsx troca o FullCalendar pelo skeleton. Vigiamos cada evento do
    // cache para garantir que isso nunca acontece.
    const cache = queryClient.getQueryCache();
    let dataWasCleared = false;
    const unsubscribe = cache.subscribe(() => {
      const query = cache.find({ queryKey: SCHEDULE_KEY, exact: true });
      if (query && query.state.data === undefined) {
        dataWasCleared = true;
      }
    });

    try {
      await invalidateAppointmentsComprehensive(queryClient, "2026-06-10", "org-1");
    } finally {
      unsubscribe();
    }

    expect(dataWasCleared).toBe(false);
    expect(queryClient.getQueryData(SCHEDULE_KEY)).toEqual(data);
  });

  it("revalida a agenda em background mantendo status success", async () => {
    const getFetchCount = await seedScheduleQuery([{ id: "appt-1" }]);

    await invalidateAppointmentsComprehensive(queryClient, "2026-06-10", "org-1");

    expect(getFetchCount()).toBe(2);
    const state = queryClient.getQueryState(SCHEDULE_KEY);
    expect(state?.status).toBe("success");
  });
});
