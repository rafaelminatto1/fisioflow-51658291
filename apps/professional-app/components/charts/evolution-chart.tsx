import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { useColors } from "@/hooks/useColorScheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface EvolutionChartProps {
	data: number[];
	labels?: string[];
	title?: string;
	color?: string;
}

export function EvolutionChart({
	data,
	labels,
	title,
	color: customColor,
}: EvolutionChartProps) {
	const colors = useColors();
	const primaryColor = customColor || colors.primary;

	if (!data || data.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.surface }]}>
				<Text style={[styles.noDataText, { color: colors.textMuted }]}>
					Sem dados para exibir
				</Text>
			</View>
		);
	}

	const chartData = data.map((value, index) => ({
		value,
		label: labels?.[index] || `${index + 1}`,
		dataPointText: `${value}`,
	}));

	return (
		<View style={[styles.container, { backgroundColor: colors.surface }]}>
			{title && (
				<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
			)}

			<LineChart
				data={chartData}
				width={SCREEN_WIDTH - 80}
				height={200}
				color={primaryColor}
				thickness={2}
				curved
				areaChart
				startFillColor={`${primaryColor}40`}
				endFillColor={`${primaryColor}05`}
				startOpacity={0.4}
				endOpacity={0.05}
				dataPointsShape="circular"
				dataPointsColor={primaryColor}
				dataPointsRadius={5}
				textColor={colors.textSecondary}
				textFontSize={11}
				isAnimated
				animationDuration={500}
				yAxisLabelWidth={20}
				yAxisThickness={0}
				xAxisThickness={0}
				noOfSections={5}
				maxValue={10}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		borderRadius: 16,
		alignItems: "center",
	},
	title: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 12,
		alignSelf: "flex-start",
	},
	noDataText: {
		fontSize: 14,
		textAlign: "center",
		paddingVertical: 32,
	},
});
