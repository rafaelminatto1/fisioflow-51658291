import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
} from "react-native";
import { useColors } from "@/hooks/useColorScheme";
import { TimeGrid } from "./TimeGrid";
import { AppointmentBase } from "@/types";
import { router } from "expo-router";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DraggableAptCard } from "./DraggableAptCard";
import { TIME_LABEL_WIDTH, formatWeekdayLabel, getTimeParts } from "./utils";

interface WeekViewProps {
	date: Date;
	appointments: AppointmentBase[];
	startHour?: number;
	endHour?: number;
	onReschedule?: (id: string, newDate: Date, time: string) => void;
}

const HOUR_HEIGHT = 60; // Must match TimeGrid

export const WeekView = ({
	date,
	appointments,
	startHour = 7,
	endHour = 20,
	onReschedule,
}: WeekViewProps) => {
	const colors = useColors();
	const weekStart = startOfWeek(date, { weekStartsOn: 1 });
	const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // Segunda a sábado
	const [scrollEnabled, setScrollEnabled] = useState(true);
	const [columnWidth, setColumnWidth] = useState(0);

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

	return (
		<View style={styles.container}>
			{/* Week Header */}
			<View style={styles.header}>
				<View style={styles.timeColumnHeader} />
				{weekDays.map((day) => (
					<View key={day.toISOString()} style={styles.dayHeader}>
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

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				scrollEnabled={scrollEnabled}
			>
				<View style={styles.gridContainer}>
					{/* Time Grid (Background) */}
					<TimeGrid
						startHour={startHour}
						endHour={endHour}
						rowHeight={HOUR_HEIGHT}
					/>

					{/* Columns Overlay */}
					<View style={styles.columnsContainer}>
						{weekDays.map((day, dayIndex) => (
							<View
								key={day.toISOString()}
								style={styles.dayColumn}
								onLayout={
									dayIndex === 0
										? (e) => setColumnWidth(e.nativeEvent.layout.width)
										: undefined
								}
							>
								{/* Touchable slots for each hour */}
								{Array.from(
									{ length: endHour - startHour + 1 },
									(_, hourIndex) => {
										const hour = startHour + hourIndex;
										return (
											<TouchableOpacity
												key={`slot-${dayIndex}-${hour}`}
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

								{/* Render Appointments for this day */}
								{getAppointmentsForDay(day).map((apt) => {
									const { hour, minutes } = getTimeParts(apt.time, apt.date);

									if (hour < startHour || hour > endHour) return null;

									const top =
										(hour - startHour) * HOUR_HEIGHT +
										(minutes / 60) * HOUR_HEIGHT;
									const height = (apt.duration / 60) * HOUR_HEIGHT;
									const aptWithPos = { ...apt, top, height };
									const colW = columnWidth > 0 ? columnWidth : 50;

									return (
										<DraggableAptCard
											key={apt.id}
											apt={aptWithPos}
											pos={{ left: 1, width: colW - 2 }}
											startHour={startHour}
											endHour={endHour}
											targetDay={day}
											allDays={weekDays}
											columnWidth={colW}
											onReschedule={onReschedule}
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
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
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
		flex: 1,
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
	scrollContent: {
		paddingBottom: 20,
	},
	gridContainer: {
		position: "relative",
	},
	columnsContainer: {
		position: "absolute",
		top: 0,
		left: TIME_LABEL_WIDTH,
		right: 0,
		bottom: 0,
		flexDirection: "row",
	},
	dayColumn: {
		flex: 1,
		position: "relative",
	},
});
