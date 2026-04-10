import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColorScheme";
import { TIME_LABEL_WIDTH } from "./utils";

interface TimeGridProps {
	startHour?: number;
	endHour?: number;
	rowHeight?: number;
}

export const TimeGrid = ({
	startHour = 7,
	endHour = 20,
	rowHeight = 60,
}: TimeGridProps) => {
	const _colors = useColors();
	const hours = Array.from(
		{ length: endHour - startHour + 1 },
		(_, i) => startHour + i,
	);

	return (
		<View style={styles.container}>
			{hours.map((hour) => (
				<View key={hour} style={[styles.row, { height: rowHeight }]}>
					<View style={styles.timeLabelContainer}>
						<Text style={styles.timeLabel}>
							{hour.toString().padStart(2, "0")}
						</Text>
					</View>
					<View style={[styles.gridLine, { borderTopColor: "#e2e8f0" }]} />
				</View>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
	},
	timeLabelContainer: {
		width: TIME_LABEL_WIDTH,
		alignItems: "flex-end",
		paddingRight: 2,
	},
	timeLabel: {
		fontSize: 7,
		fontWeight: "600",
		color: "#94a3b8",
	},
	gridLine: {
		flex: 1,
		borderTopWidth: 1,
		borderStyle: "solid",
		height: "100%",
	},
});
