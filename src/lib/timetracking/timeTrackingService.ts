/**
 * Time Tracking Service — Neon/Cloudflare Workers
 */
import { timeEntriesApi } from "@/lib/api/workers-client";
import type {
	TimeEntry,
	TimeEntryFilters,
	ActiveTimer,
} from "@/types/timetracking";

export async function createTimeEntry(
	_organizationId: string,
	entry: Omit<TimeEntry, "id" | "created_at" | "updated_at">,
): Promise<TimeEntry> {
	const result = await timeEntriesApi.create(entry as Record<string, unknown>);
	return result.data;
}

export async function getTimeEntry(
	_organizationId: string,
	entryId: string,
): Promise<TimeEntry | null> {
	const result = await timeEntriesApi.list({ limit: 1 });
	return result.data.find((e) => e.id === entryId) ?? null;
}

export async function updateTimeEntry(
	_organizationId: string,
	entryId: string,
	updates: Partial<Omit<TimeEntry, "id" | "created_at" | "updated_at">>,
): Promise<void> {
	await timeEntriesApi.update(entryId, updates as Record<string, unknown>);
}

export async function deleteTimeEntry(
	_organizationId: string,
	entryId: string,
): Promise<void> {
	await timeEntriesApi.delete(entryId);
}

export async function getTimeEntries(
	_organizationId: string,
	filters: TimeEntryFilters = {},
): Promise<TimeEntry[]> {
	const result = await timeEntriesApi.list({
		userId: filters.user_id as string | undefined,
		startDate: filters.start_date
			? filters.start_date instanceof Date
				? filters.start_date.toISOString()
				: String(filters.start_date)
			: undefined,
		endDate: filters.end_date
			? filters.end_date instanceof Date
				? filters.end_date.toISOString()
				: String(filters.end_date)
			: undefined,
		patientId: filters.patient_id as string | undefined,
		limit: typeof filters.limit === "number" ? filters.limit : undefined,
	});
	return result.data ?? [];
}

export async function getTimeEntriesByPeriod(
	organizationId: string,
	userId: string,
	startDate: Date,
	endDate: Date,
): Promise<TimeEntry[]> {
	return getTimeEntries(organizationId, {
		user_id: userId,
		start_date: startDate.toISOString() as unknown,
		end_date: endDate.toISOString() as unknown,
	});
}

// Real-time replaced with polling — returns unsubscribe noop
export function listenToUserTimeEntries(
	organizationId: string,
	userId: string,
	callback: (entries: TimeEntry[]) => void,
	onError?: (error: Error) => void,
): () => void {
	let active = true;
	const poll = async () => {
		try {
			const entries = await getTimeEntries(organizationId, { user_id: userId });
			if (active) callback(entries);
		} catch (err) {
			onError?.(err as Error);
		}
	};
	poll();
	const interval = setInterval(poll, 30_000);
	return () => {
		active = false;
		clearInterval(interval);
	};
}

export function listenToTodayTimeEntries(
	organizationId: string,
	userId: string,
	callback: (entries: TimeEntry[]) => void,
): () => void {
	const startOfDay = new Date();
	startOfDay.setHours(0, 0, 0, 0);
	const endOfDay = new Date();
	endOfDay.setHours(23, 59, 59, 999);

	let active = true;
	const poll = async () => {
		try {
			const all = await getTimeEntries(organizationId, {
				user_id: userId,
				start_date: startOfDay.toISOString() as unknown,
				end_date: endOfDay.toISOString() as unknown,
			});
			if (active) callback(all);
		} catch {
			/* silent */
		}
	};
	poll();
	const interval = setInterval(poll, 30_000);
	return () => {
		active = false;
		clearInterval(interval);
	};
}

export async function saveActiveTimerDraft(
	userId: string,
	timer: ActiveTimer,
): Promise<void> {
	await timeEntriesApi.saveTimerDraft(userId, timer);
}

export async function getActiveTimerDraft(
	userId: string,
): Promise<ActiveTimer | null> {
	const result = await timeEntriesApi.getTimerDraft(userId);
	return result.data ?? null;
}

export async function clearActiveTimerDraft(userId: string): Promise<void> {
	await timeEntriesApi.clearTimerDraft(userId);
}

export async function finalizeTimer(
	organizationId: string,
	userId: string,
	timer: ActiveTimer,
): Promise<TimeEntry> {
	const startTime = new Date(timer.start_time);
	const endTime = new Date();
	const durationSeconds = Math.floor(
		(endTime.getTime() - startTime.getTime()) / 1000,
	);

	const entry = await createTimeEntry(organizationId, {
		user_id: userId,
		organization_id: organizationId,
		description: timer.description,
		start_time: startTime.toISOString(),
		end_time: endTime.toISOString(),
		duration_seconds: durationSeconds,
		is_billable: timer.is_billable,
		hourly_rate: timer.hourly_rate,
		total_value: timer.hourly_rate
			? (durationSeconds / 3600) * timer.hourly_rate
			: undefined,
		task_id: timer.task_id,
		patient_id: timer.patient_id,
		project_id: timer.project_id,
		tags: timer.tags,
	});

	await clearActiveTimerDraft(userId);
	return entry;
}

export async function getTimeStats(
	organizationId: string,
	userId: string,
	startDate: Date,
	endDate: Date,
) {
	const result = await timeEntriesApi.stats({
		userId,
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
	});
	const s = result.data;
	return {
		total_seconds: Number(s.total_seconds),
		billable_seconds: Number(s.billable_seconds),
		non_billable_seconds: Number(s.non_billable_seconds),
		entries_count: Number(s.entries_count),
		total_value: Number(s.total_value),
	};
}

export async function getDailyBreakdown(
	organizationId: string,
	userId: string,
	startDate: Date,
	endDate: Date,
): Promise<
	Array<{
		date: string;
		total_seconds: number;
		billable_seconds: number;
		entries: number;
	}>
> {
	const entries = await getTimeEntriesByPeriod(
		organizationId,
		userId,
		startDate,
		endDate,
	);

	const byDate = new Map<
		string,
		{ total_seconds: number; billable_seconds: number; entries: number }
	>();
	entries.forEach((entry) => {
		const dateKey = new Date(entry.start_time).toISOString().split("T")[0];
		if (!byDate.has(dateKey))
			byDate.set(dateKey, {
				total_seconds: 0,
				billable_seconds: 0,
				entries: 0,
			});
		const stats = byDate.get(dateKey)!;
		stats.total_seconds += entry.duration_seconds;
		stats.entries += 1;
		if (entry.is_billable) stats.billable_seconds += entry.duration_seconds;
	});

	return Array.from(byDate.entries())
		.map(([date, stats]) => ({ date, ...stats }))
		.sort((a, b) => a.date.localeCompare(b.date));
}
