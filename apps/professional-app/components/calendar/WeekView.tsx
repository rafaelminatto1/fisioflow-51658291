import React, {
	useState,
	useRef,
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
} from "react-native";
import { useColors } from "@/hooks/useColorScheme";
import { AppointmentBase } from "@/types";
import { router } from "expo-router";
import {
	format,
	startOfWeek,
	addDays,
	isSameDay,
	differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { DraggableAptCard } from "./DraggableAptCard";
import { getTimeParts } from "./utils";

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
const TIME_LABEL_WIDTH_LOCAL = 35;

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
	const headerScrollRef = useRef<ScrollView>(null);
	const contentScrollRef = useRef<ScrollView>(null);
	const verticalScrollRef = useRef<ScrollView>(null);

	const dayWidth = (screenWidth - TIME_LABEL_WIDTH_LOCAL) / DAYS_VISIBLE;

	const [scrollEnabled, setScrollEnabled] = useState(true);

	const weekStart = startOfWeek(date, { weekStartsOn: 1 });

	// We render 7 days (Monday to Sunday)
	const days = useMemo(() => {
		return Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));
	}, [weekStart]);

	// Initial scroll
	useEffect(() => {
		const diff = differenceInDays(date, weekStart);
		if (diff >= 0 && diff < 7) {
			const scrollX = diff * dayWidth;
			const timer = setTimeout(() => {
				headerScrollRef.current?.scrollTo({ x: scrollX, animated: false });
				contentScrollRef.current?.scrollTo({ x: scrollX, animated: false });
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [weekStart, date, dayWidth]);

	// Synchronize horizontal scrolls
	const onHeaderScroll = (event: any) => {
		const x = event.nativeEvent.contentOffset.x;
		contentScrollRef.current?.scrollTo({ x, animated: false });
	};

	const onContentScroll = (event: any) => {
		const x = event.nativeEvent.contentOffset.x;
		headerScrollRef.current?.scrollTo({ x, animated: false });
	};

	const handleGridPress = (day: Date, hour: number) => {
		const dateStr = format(day, "dd/MM/yyyy");
		const timeStr = `${hour.toString().padStart(2, "0")}:00`;
		router.push(`/appointment-form?date=${dateStr}&time=${timeStr}` as any);
	};

	const getAppointmentsForDay = (day: Date) => {
		return appointments.filter((apt) => {
			const aptDate = new Date(apt.date);
			return isSameDay(aptDate, day);
		});
	};

	const hours = Array.from(
		{ length: endHour - startHour + 1 },
		(_, i) => startHour + i,
	);

	return (
		<View style={styles.container}>
			{/* Sticky Header with horizontal sync */}
			<View style={styles.stickyHeaderContainer}>
				<View style={[styles.timeColumnSpacer, { width: TIME_LABEL_WIDTH_LOCAL }]} />
				<ScrollView
					ref={headerScrollRef}
					horizontal
					showsHorizontalScrollIndicator={false}
					onScroll={onHeaderScroll}
					scrollEventThrottle={16}
					style={styles.horizontalScroll}
				>
					<View style={styles.daysHeaderRow}>
						{days.map((day) => (
							<View
								key={`header-${day.toISOString()}`}
								style={[styles.dayHeader, { width: dayWidth }]}
							>
								<Text style={[styles.dayName, { color: colors.textSecondary }]}>
									{format(day, "EEE", { locale: ptBR }).toUpperCase()}
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
									{format(day, "d")}
								</Text>
							</View>
						))}
					</View>
				</ScrollView>
			</View>

			<ScrollView
				ref={verticalScrollRef}
				style={styles.container}
				contentContainerStyle={styles.verticalContent}
				scrollEnabled={scrollEnabled}
			>
				<View style={styles.mainRow}>
					{/* Fixed Time Column (moves vertically with scroll) */}
					<View style={[styles.timeColumn, { width: TIME_LABEL_WIDTH_LOCAL }]}>
						{hours.map((hour) => (
							<View key={hour} style={[styles.timeSlot, { height: HOUR_HEIGHT }]}>
								<Text style={[styles.timeText, { color: colors.textSecondary }]}>
									{hour.toString().padStart(2, "0")}
								</Text>
							</View>
						))}
					</View>

					{/* Horizontal Scrollable Grid */}
					<ScrollView
						ref={contentScrollRef}
						horizontal
						showsHorizontalScrollIndicator={false}
						onScroll={onContentScroll}
						scrollEventThrottle={16}
						style={styles.horizontalScroll}
					>
						<View style={[styles.gridRow, { width: dayWidth * 7 }]}>
							{/* Horizontal Grid Lines */}
							<View style={styles.absoluteLines}>
								{hours.map((hour) => (
									<View
										key={`line-${hour}`}
										style={[
											styles.horizontalLine,
											{ height: HOUR_HEIGHT, borderBottomColor: colors.border },
										]}
									/>
								))}
							</View>

							{/* Columns */}
							<View style={styles.columnsContainer}>
								{days.map((day) => (
									<View
										key={`col-${day.toISOString()}`}
										style={[
											styles.dayColumn,
											{
												width: dayWidth,
												borderRightWidth: 1,
												borderRightColor: colors.border,
											},
										]}
									>
										{/* Touchable slots */}
										{hours.map((hour) => (
											<TouchableOpacity
												key={`slot-${day.toISOString()}-${hour}`}
												style={{ height: HOUR_HEIGHT, width: "100%" }}
												onPress={() => handleGridPress(day, hour)}
											/>
										))}

										{/* Appointments */}
										{getAppointmentsForDay(day).map((apt) => {
											const { hour, minutes } = getTimeParts(apt.time, apt.date);
											if (hour < startHour || hour > endHour) return null;

											const top =
												(hour - startHour) * HOUR_HEIGHT +
												(minutes / 60) * HOUR_HEIGHT;
											const height = (apt.duration / 60) * HOUR_HEIGHT;
											const aptWithPos = { ...apt, top, height };

											return (
												<DraggableAptCard
													key={apt.id}
													apt={aptWithPos}
													pos={{ left: 2, width: dayWidth - 4 }}
													startHour={startHour}
													endHour={endHour}
													hourHeight={HOUR_HEIGHT}
													targetDay={day}
													allDays={days}
													columnWidth={dayWidth}
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
					</ScrollView>
				</View>
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	stickyHeaderContainer: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderColor: "#e5e5e5",
		backgroundColor: "#fff",
		zIndex: 20,
	},
	timeColumnSpacer: {
		borderRightWidth: 1,
		borderColor: "#e5e5e5",
	},
	verticalContent: {
		paddingBottom: 40,
	},
	mainRow: {
		flexDirection: "row",
	},
	timeColumn: {
		backgroundColor: "#fff",
		borderRightWidth: 1,
		borderColor: "#e5e5e5",
	},
	timeSlot: {
		justifyContent: "center",
		alignItems: "center",
	},
	timeText: {
		fontSize: 9,
		fontWeight: "600",
	},
	horizontalScroll: {
		flex: 1,
	},
	daysHeaderRow: {
		flexDirection: "row",
		height: 50,
	},
	dayHeader: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 4,
	},
	dayName: {
		fontSize: 9,
		fontWeight: "600",
		marginBottom: 1,
	},
	dayNumber: {
		fontSize: 16,
		fontWeight: "700",
	},
	gridRow: {
		position: "relative",
	},
	absoluteLines: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	horizontalLine: {
		width: "100%",
		borderBottomWidth: 1,
	},
	columnsContainer: {
		flexDirection: "row",
	},
	dayColumn: {
		position: "relative",
	},
});

