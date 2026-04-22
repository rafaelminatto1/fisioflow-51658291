import { describe, expect, it } from "vitest";
import {
	DEFAULT_SCHEDULE_VIEW,
	parseScheduleViewParam,
	updateScheduleViewSearchParams,
} from "../viewParams";

describe("schedule view params", () => {
	it("falls back to week when the view param is absent or invalid", () => {
		expect(parseScheduleViewParam(null)).toBe(DEFAULT_SCHEDULE_VIEW);
		expect(parseScheduleViewParam(undefined)).toBe(DEFAULT_SCHEDULE_VIEW);
		expect(parseScheduleViewParam("invalid")).toBe(DEFAULT_SCHEDULE_VIEW);
	});

	it("accepts day, week, and month view params", () => {
		expect(parseScheduleViewParam("day")).toBe("day");
		expect(parseScheduleViewParam("week")).toBe("week");
		expect(parseScheduleViewParam("month")).toBe("month");
	});

	it("preserves the anchor date and existing filters when changing the view", () => {
		const currentParams = new URLSearchParams({
			date: "2026-04-22",
			status: "agendado,confirmado",
			patient: "rafael",
			view: "week",
		});

		const nextParams = updateScheduleViewSearchParams(currentParams, "month");

		expect(nextParams.get("date")).toBe("2026-04-22");
		expect(nextParams.get("status")).toBe("agendado,confirmado");
		expect(nextParams.get("patient")).toBe("rafael");
		expect(nextParams.get("view")).toBe("month");
	});
});
