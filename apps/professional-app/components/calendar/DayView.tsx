import React, { useState } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	useWindowDimensions,
} from "react-native";
import { useColors } from "@/hooks/useColorScheme";
import { TimeGrid } from "./TimeGrid";
import { AppointmentBase } from "@/types";
import { router } from "expo-router";
import { format, isSameDay } from "date-fns";
import { DraggableAptCard } from "./DraggableAptCard";
import { TIME_LABEL_WIDTH, getTimeParts } from "./utils";

interface DayViewProps {
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

const HOUR_HEIGHT = 60; // Must match TimeGrid

export const DayView = ({
	date,
	appointments,
	startHour = 7,
	endHour = 20,
	onReschedule,
	onRescheduleRequest,
}: DayViewProps) => {
	const colors = useColors();
	const { width: windowWidth } = useWindowDimensions();
	const [scrollEnabled, setScrollEnabled] = useState(true);

	// Calculate available width for appointments (total width - time label width)
	const RIGHT_MARGIN = 40; // Space on the right to allow tapping the grid
	const availableWidth = windowWidth - TIME_LABEL_WIDTH - RIGHT_MARGIN;

	const handleGridPress = (hour: number) => {
		// Navigate to appointment form with pre-filled date and time
		const dateStr = format(date, "dd/MM/yyyy");
		const timeStr = `${hour.toString().padStart(2, "0")}:00`;
		router.push(`/appointment-form?date=${dateStr}&time=${timeStr}` as any);
	};

	// Helper to detect overlapping appointments
	const detectOverlaps = (
		appointments: Array<{ top: number; height: number; id: string }>,
	) => {
		const groups: Array<
			Array<{ top: number; height: number; id: string; index: number }>
		> = [];

		appointments.forEach((apt, index) => {
			const aptWithIndex = { ...apt, index };
			let addedToGroup = false;

			// Check if this appointment overlaps with any existing group
			for (const group of groups) {
				const overlapsWithGroup = group.some((existing) => {
					const aptEnd = apt.top + apt.height;
					const existingEnd = existing.top + existing.height;

					// Check if appointments overlap (with 2px margin for visual clarity)
					return !(aptEnd <= existing.top + 2 || apt.top >= existingEnd - 2);
				});

				if (overlapsWithGroup) {
					group.push(aptWithIndex);
					addedToGroup = true;
					break;
				}
			}

			// If not added to any group, create new group
			if (!addedToGroup) {
				groups.push([aptWithIndex]);
			}
		});

		// Calculate positioning for each appointment using pixel values
		const positioning = new Map<string, { left: number; width: number }>();

		groups.forEach((group) => {
			const groupSize = group.length;
			group.forEach((apt, indexInGroup) => {
				const widthPerItem = availableWidth / groupSize;
				const leftPosition = widthPerItem * indexInGroup;
				const gap = 4; // 4px gap between appointments

				positioning.set(apt.id, {
					left: leftPosition + (indexInGroup > 0 ? gap / 2 : 0),
					width: widthPerItem - (groupSize > 1 ? gap : 0),
				});
			});
		});

		return positioning;
	};

	const renderAppointments = () => {
		// First pass: filter and calculate positions
		const processedAppointments = appointments
			.filter((apt) => {
				// Robust date matching
				const aptDate = new Date(apt.date);
				return isSameDay(aptDate, date);
			})
			.map((apt) => {
				const { hour, minutes } = getTimeParts(apt.time, apt.date);

				if (hour < startHour || hour > endHour) return null;

				const top =
					(hour - startHour) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
				const height = (apt.duration / 60) * HOUR_HEIGHT;

				return {
					...apt,
					top,
					height,
				};
			})
			.filter(Boolean) as Array<
			AppointmentBase & { top: number; height: number }
		>;

		// Detect overlaps and calculate positioning
		const positioning = detectOverlaps(processedAppointments);

		// Second pass: render with calculated positions
		return processedAppointments.map((apt) => {
			const pos = positioning.get(apt.id) || { left: 0, width: availableWidth };

			return (
				<DraggableAptCard
					key={apt.id}
					apt={apt}
					pos={pos}
					startHour={startHour}
					endHour={endHour}
					hourHeight={HOUR_HEIGHT}
					targetDay={date}
					allDays={[date]}
					columnWidth={availableWidth}
					onReschedule={onReschedule}
					onRescheduleRequest={onRescheduleRequest}
					onScrollEnable={setScrollEnabled}
					colors={{
						primary: colors.primary,
						textSecondary: colors.textSecondary,
					}}
					onPress={() => router.push(`/appointment-form?id=${apt.id}` as any)}
				/>
			);
		});
	};

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.content}
			scrollEnabled={scrollEnabled}
		>
			<View style={styles.gridContainer}>
				{/* Render grid lines and labels */}
				<TimeGrid
					startHour={startHour}
					endHour={endHour}
					rowHeight={HOUR_HEIGHT}
				/>

				{/* Transparent touchable overlay for empty slots */}
				<View style={styles.touchableOverlay}>
					{Array.from({ length: endHour - startHour + 1 }, (_, i) => {
						const hour = startHour + i;
						return (
							<TouchableOpacity
								key={`slot-${hour}`}
								style={{ height: HOUR_HEIGHT, width: "100%" }}
								onPress={() => handleGridPress(hour)}
							/>
						);
					})}
				</View>

				{/* Appointments Layer */}
				<View style={styles.appointmentsLayer} pointerEvents="box-none">
					{renderAppointments()}
				</View>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		paddingBottom: 20,
	},
	gridContainer: {
		position: "relative",
		paddingTop: 10,
	},
	touchableOverlay: {
		position: "absolute",
		top: 10, // Match paddingTop of gridContainer if needed, but TimeGrid handles rows
		left: TIME_LABEL_WIDTH,
		right: 0,
		bottom: 0,
		zIndex: 1,
	},
	appointmentsLayer: {
		position: "absolute",
		top: 10,
		left: TIME_LABEL_WIDTH,
		right: 0,
		bottom: 0,
		zIndex: 2, // Above touchable overlay
	},
	appointmentItem: {
		position: "absolute",
		borderRadius: 8,
		borderLeftWidth: 4,
		padding: 4,
		overflow: "hidden",
	},
	aptTitle: {
		fontSize: 12,
		fontWeight: "bold",
	},
	aptTime: {
		fontSize: 10,
	},
});
