export type ScheduleViewType = "day" | "week" | "month";

export const DEFAULT_SCHEDULE_VIEW: ScheduleViewType = "week";

export function parseScheduleViewParam(value: string | null | undefined): ScheduleViewType {
  if (value === "day" || value === "week" || value === "month") {
    return value;
  }

  return DEFAULT_SCHEDULE_VIEW;
}

export function updateScheduleViewSearchParams(
  searchParams: URLSearchParams,
  view: ScheduleViewType,
): URLSearchParams {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.set("view", view);
  return nextParams;
}
