import { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	format,
} from "date-fns";
import { useColors } from "@/hooks/useColorScheme";
import { useAppointments } from "@/hooks/useAppointments";
import { useHaptics } from "@/hooks/useHaptics";
import { Skeleton } from "@/components";
import { CalendarView, ViewMode } from "@/components/calendar/CalendarView";

const appointmentsCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5;

function getCacheKey(startDate: Date, endDate: Date): string {
	return `${startDate.toISOString()}-${endDate.toISOString()}`;
}

function AgendaSkeleton() {
	const colors = useColors();
	return (
		<View style={styles.skeletonContainer}>
			<View style={styles.skeletonHeader}>
				<View style={styles.skeletonHeaderRow}>
					{[1, 2, 3, 4, 5, 6, 7].map((i) => (
						<View key={i} style={styles.skeletonDayCol}>
							<Skeleton width={32} height={14} variant="text" />
							<Skeleton
								width={36}
								height={36}
								variant="circular"
								style={{ marginTop: 6 }}
							/>
						</View>
					))}
				</View>
			</View>
			<View
				style={[styles.skeletonTimeline, { borderTopColor: colors.border }]}
			>
				{[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => (
					<View key={hour} style={styles.skeletonTimeSlot}>
						<Skeleton width={40} height={12} variant="text" />
						<View style={styles.skeletonSlotContent}>
							{hour % 2 === 0 && (
								<View
									style={[
										styles.skeletonCard,
										{ backgroundColor: colors.surface },
									]}
								>
									<Skeleton width="60%" height={14} variant="text" />
									<Skeleton
										width="40%"
										height={12}
										variant="text"
										style={{ marginTop: 4 }}
									/>
								</View>
							)}
						</View>
					</View>
				))}
			</View>
		</View>
	);
}

export default function AgendaScreen() {
	const colors = useColors();
	const { light, success: hapticSuccess } = useHaptics();

	const [viewMode, setViewMode] = useState<ViewMode>("day");
	const [selectedDate, setSelectedDate] = useState(new Date());

	const getFetchRange = useCallback(() => {
		if (viewMode === "month") {
			return {
				startDate: startOfMonth(selectedDate),
				endDate: endOfMonth(selectedDate),
			};
		}
		return {
			startDate: startOfWeek(selectedDate, { weekStartsOn: 0 }),
			endDate: endOfWeek(selectedDate, { weekStartsOn: 0 }),
		};
	}, [viewMode, selectedDate]);

	const { startDate, endDate } = getFetchRange();
	const cacheKey = getCacheKey(startDate, endDate);
	const cached = appointmentsCache.get(cacheKey);
	const isCacheValid = cached && Date.now() - cached.timestamp < CACHE_TTL;

	const {
		data: appointments,
		isLoading,
		updateAsync,
	} = useAppointments({
		startDate,
		endDate,
		limit: 1000,
		refetchInterval: 30_000,
		initialData: isCacheValid ? cached.data : undefined,
	});

	useEffect(() => {
		if (appointments && appointments.length > 0) {
			appointmentsCache.set(cacheKey, {
				data: appointments,
				timestamp: Date.now(),
			});
		}
	}, [appointments, cacheKey]);

	const showLoading = isLoading && !isCacheValid && !appointments?.length;

	const handleDateChange = useCallback(
		(date: Date) => {
			light();
			setSelectedDate(date);
		},
		[light],
	);

	const handleViewModeChange = useCallback(
		(mode: ViewMode) => {
			light();
			setViewMode(mode);
		},
		[light],
	);

	const handleReschedule = useCallback(
		async (id: string, newDate: Date, newTime: string) => {
			const apt = appointments?.find((a) => a.id === id);
			if (!apt) return;
			try {
				const dateStr = format(newDate, "yyyy-MM-dd");
				await updateAsync({
					id,
					data: {
						date: dateStr,
						time: newTime,
						duration: apt.duration,
					},
				});
				hapticSuccess();
			} catch {}
		},
		[appointments, updateAsync, hapticSuccess],
	);

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["left", "right"]}
		>
			{showLoading ? (
				<AgendaSkeleton />
			) : (
				<CalendarView
					appointments={appointments ?? []}
					date={selectedDate}
					onDateChange={handleDateChange}
					viewMode={viewMode}
					onViewModeChange={handleViewModeChange}
					onReschedule={handleReschedule}
				/>
			)}

			{!showLoading && (
				<TouchableOpacity
					style={[
						styles.fab,
						{ backgroundColor: colors.primary, shadowColor: colors.primary },
					]}
					onPress={() => {
						light();
						router.push("/appointment-form");
					}}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel="Novo Agendamento"
				>
					<Ionicons name="add" size={32} color="#fff" />
				</TouchableOpacity>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	fab: {
		position: "absolute",
		right: 24,
		bottom: 24,
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		elevation: 6,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
	},
	skeletonContainer: {
		flex: 1,
	},
	skeletonHeader: {
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	skeletonHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	skeletonDayCol: {
		alignItems: "center",
	},
	skeletonTimeline: {
		flex: 1,
		borderTopWidth: 1,
		paddingHorizontal: 16,
	},
	skeletonTimeSlot: {
		flexDirection: "row",
		paddingTop: 16,
		minHeight: 60,
	},
	skeletonSlotContent: {
		flex: 1,
		marginLeft: 12,
	},
	skeletonCard: {
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
		gap: 4,
	},
});
