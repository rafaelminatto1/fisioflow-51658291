import React, {
	useState,
	useRef,
	useCallback,
	useMemo,
	useEffect,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	useWindowDimensions,
	NativeSyntheticEvent,
	NativeScrollEvent,
} from "react-native";
import { useColors } from "@/hooks/useColorScheme";
import { TimeGrid } from "./TimeGrid";
import { AppointmentBase } from "@/types";
import { router } from "expo-router";
import {
	format,
	startOfWeek,
	addDays,
	isSameDay,
	subWeeks,
	addWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { DraggableAptCard } from "./DraggableAptCard";
import { TIME_LABEL_WIDTH, formatWeekdayLabel, getTimeParts } from "./utils";

interface WeekViewProps {
	date: Date;
	appointments: AppointmentBase[];
	startHour?: number;
	endHour?: number;
	onReschedule?: (id: string, newDate: Date, time: string) => void;
	onRescheduleRequest?: (
		id: string,
		newDate: Date,
		time: string,
		confirm: (confirm: boolean) => void,
	) => void;
}

const HOUR_HEIGHT = 60;
const DAYS_VISIBLE = 3;

export const WeekView = ({
	date,
	appointments,
	startHour = 7,
	endHour = 20,
	onReschedule,
	onRescheduleRequest,
}: WeekViewProps) => {
	const { width: screenWidth } = useWindowDimensions();
	const colors = useColors();
	const scrollRef = useRef<ScrollView>(null);

	const dayWidth = Math.floor((screenWidth - TIME_LABEL_WIDTH) / DAYS_VISIBLE);

	const [scrollEnabled, setScrollEnabled] = useState(true);
	const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

	const weekStart = startOfWeek(date, { weekStartsOn: 1 });

	const allWeeks = useMemo(() => {
		const weeks: Date[][] = [];
		for (let i = -4; i <= 4; i++) {
			const weekStartDate = addWeeks(weekStart, i);
			const week = Array.from({ length: 6 }, (_, idx) =>
				addDays(weekStartDate, idx),
			);
			weeks.push(week);
		}
		return weeks;
	}, [weekStart]);

	const totalContentWidth = dayWidth * 6 * 9;
	const contentPadding = (screenWidth - dayWidth * DAYS_VISIBLE) / 2;

	useEffect(() => {
		setTimeout(() => {
			scrollRef.current?.scrollTo({
				x: 4 * 6 * dayWidth,
				animated: false,
			});
		}, 100);
	}, []);

	const handleGridPress = (day: Date, hour: number) => {
		const dateStr = format(day, "dd/MM/yyyy");
		const timeStr = `${hour.toString().padStart(2, "0")}:00`;
		router.push(`/appointment-form?date=${dateStr}&time=${timeStr}` as any);
	};

	const getAppointmentsForDay = (day: Date) => {
		return appointments.filter((apt) => {
			const aptDate = new Date(apt.date);
			return (
				aptDate.getFullYear() === day.getFullYear() &&
				aptDate.getMonth() === day.getMonth() &&
				aptDate.getDate() === day.getDate()
			);
		});
	};

	const renderWeek = (weekDays: Date[], weekIndex: number) => (
		<View key={`week-${weekIndex}`} style={styles.weekContainer}>
			<View style={styles.header}>
				<View style={styles.timeColumnHeader} />
				{weekDays.map((day) => (
					<View
						key={day.toISOString()}
						style={[styles.dayHeader, { width: dayWidth }]}
					>
						<Text style={[styles.dayName, { color: colors.textSecondary }]}>
							{formatWeekdayLabel(day)}
						</Text>
						<Text
							style={[
								styles.dayNumber,
								{
									color: isSameDay(day, new Date())
										? colors.primary
										: colors.text,
								},
							]}
						>
							{format(day, "d", { locale: ptBR })}
						</Text>
					</View>
				))}
			</View>

			<View style={styles.gridContainer}>
				<View style={styles.timeGridWrapper}>
					<TimeGrid
						startHour={startHour}
						endHour={endHour}
						rowHeight={HOUR_HEIGHT}
					/>
				</View>

				<View style={styles.columnsContainer}>
					{weekDays.map((day, dayIndex) => (
						<View
							key={day.toISOString()}
							style={[styles.dayColumn, { width: dayWidth }]}
						>
							{Array.from(
								{ length: endHour - startHour + 1 },
								(_, hourIndex) => {
									const hour = startHour + hourIndex;
									return (
										<TouchableOpacity
											key={`slot-${weekIndex}-${dayIndex}-${hour}`}
											style={{
												height: HOUR_HEIGHT,
												width: "100%",
												borderRightWidth: 1,
												borderRightColor: colors.border,
											}}
											onPress={() => handleGridPress(day, hour)}
										/>
									);
								},
							)}

							{getAppointmentsForDay(day).map((apt) => {
								const { hour, minutes } = getTimeParts(apt.time, apt.date);

								if (hour < startHour || hour > endHour) return null;

								const top =
									(hour - startHour) * HOUR_HEIGHT +
									(minutes / 60) * HOUR_HEIGHT;
								const height = (apt.duration / 60) * HOUR_HEIGHT;
								const aptWithPos = { ...apt, top, height };
								const colW = dayWidth - 4;

								return (
									<DraggableAptCard
										key={apt.id}
										apt={aptWithPos}
										pos={{ left: 2, width: colW }}
										startHour={startHour}
										endHour={endHour}
										targetDay={day}
										allDays={weekDays}
										columnWidth={colW}
										onReschedule={onReschedule}
										onRescheduleRequest={onRescheduleRequest}
										onScrollEnable={setScrollEnabled}
										colors={{
											primary: colors.primary,
											textSecondary: colors.textSecondary,
										}}
										onPress={() =>
											router.push(`/appointment-form?id=${apt.id}` as any)
										}
									/>
								);
							})}
						</View>
					))}
				</View>
			</View>
		</View>
	);

	return (
		<View style={styles.container}>
			<ScrollView
				ref={scrollRef}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{
					width: totalContentWidth + screenWidth,
					paddingLeft: contentPadding,
				}}
				decelerationRate="normal"
				removeClippedSubviews={false}
			>
				{allWeeks.map((week, index) => renderWeek(week, index))}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	weekContainer: {
		minWidth: "100%",
	},
	header: {
		flexDirection: "row",
		height: 54,
		borderBottomWidth: 1,
		borderColor: "#e5e5e5",
	},
	timeColumnHeader: {
		width: TIME_LABEL_WIDTH,
	},
	dayHeader: {
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 4,
		paddingHorizontal: 2,
	},
	dayName: {
		fontSize: 10,
		fontWeight: "600",
	},
	dayNumber: {
		fontSize: 16,
		fontWeight: "700",
	},
	gridContainer: {
		flexDirection: "row",
	},
	timeGridWrapper: {
		width: TIME_LABEL_WIDTH,
	},
	columnsContainer: {
		flexDirection: "row",
	},
	dayColumn: {
		position: "relative",
	},
});
