import { describe, expect, it } from "vitest";
import {
	diffMinutes,
	formatLocalDate,
	formatLocalTime,
	roundDownToMinutes,
	toLocalISOString,
} from "../time";

describe("toLocalISOString", () => {
	it("builds a local ISO string from string date + HH:mm", () => {
		expect(toLocalISOString("2026-03-15", "14:30")).toBe(
			"2026-03-15T14:30:00",
		);
	});

	it("never appends 'Z' (must be local, not UTC)", () => {
		const s = toLocalISOString("2026-03-15", "14:30");
		expect(s.endsWith("Z")).toBe(false);
		expect(s.includes("+")).toBe(false);
	});

	it("accepts a Date and extracts local wall-clock day", () => {
		const d = new Date(2026, 0, 10, 23, 59);
		expect(toLocalISOString(d, "07:00")).toBe("2026-01-10T07:00:00");
	});

	it("accepts already-HH:mm:ss strings", () => {
		expect(toLocalISOString("2026-06-01", "09:15:30")).toBe(
			"2026-06-01T09:15:30",
		);
	});

	it("handles midnight without rolling into next day", () => {
		expect(toLocalISOString("2026-12-31", "00:00")).toBe(
			"2026-12-31T00:00:00",
		);
	});
});

describe("formatLocalDate / formatLocalTime", () => {
	it("formats local midnight", () => {
		const d = new Date(2026, 3, 23, 0, 0);
		expect(formatLocalDate(d)).toBe("2026-04-23");
		expect(formatLocalTime(d)).toBe("00:00");
	});

	it("zero-pads single digits", () => {
		const d = new Date(2026, 0, 5, 7, 8);
		expect(formatLocalDate(d)).toBe("2026-01-05");
		expect(formatLocalTime(d)).toBe("07:08");
	});
});

describe("roundDownToMinutes", () => {
	it("snaps 14:37 to 14:30 with 15-min buckets", () => {
		const d = new Date(2026, 0, 1, 14, 37, 29);
		const rounded = roundDownToMinutes(d, 15);
		expect(rounded.getHours()).toBe(14);
		expect(rounded.getMinutes()).toBe(30);
		expect(rounded.getSeconds()).toBe(0);
	});

	it("keeps exact boundary unchanged", () => {
		const d = new Date(2026, 0, 1, 14, 30, 0);
		const rounded = roundDownToMinutes(d, 15);
		expect(rounded.getTime()).toBe(d.getTime());
	});
});

describe("diffMinutes", () => {
	it("returns positive minutes between start and end", () => {
		const start = new Date(2026, 0, 1, 10, 0);
		const end = new Date(2026, 0, 1, 11, 30);
		expect(diffMinutes(start, end)).toBe(90);
	});

	it("returns 0 when end is before start (no negatives)", () => {
		const start = new Date(2026, 0, 1, 11, 0);
		const end = new Date(2026, 0, 1, 10, 0);
		expect(diffMinutes(start, end)).toBe(0);
	});
});
