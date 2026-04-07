import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Modal as RNModal,
	SafeAreaView,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Card } from "@/components";
import {
	format,
	subDays,
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	subMonths,
} from "date-fns";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type DatePeriod =
	| "today"
	| "week"
	| "month"
	| "thisMonth"
	| "lastMonth"
	| "custom";

export interface FinancialFilters {
	status: "all" | "pending" | "paid";
	datePeriod: DatePeriod;
	customDateRange: { start: Date; end: Date } | null;
	patientId?: string;
	paymentMethod?: string;
	category?: string;
}

interface FinancialFiltersProps {
	filters: FinancialFilters;
	onFiltersChange: (filters: FinancialFilters) => void;
	hasActiveFilters: boolean;
}

export function FinancialFilters({
	filters,
	onFiltersChange,
	hasActiveFilters,
}: FinancialFiltersProps) {
	const colors = useColors();
	const [showDateModal, setShowDateModal] = useState(false);
	const [tempDateRange, setTempDateRange] = useState<{
		start: Date;
		end: Date;
	}>({
		start: filters.customDateRange?.start || new Date(),
		end: filters.customDateRange?.end || new Date(),
	});

	const DATE_PERIODS = [
		{
			label: "Hoje",
			value: "today" as DatePeriod,
			icon: "calendar-outline" as const,
		},
		{
			label: "Última semana",
			value: "week" as DatePeriod,
			icon: "time-outline" as const,
		},
		{
			label: "Últimos 30 dias",
			value: "month" as DatePeriod,
			icon: "calendar-number-outline" as const,
		},
		{
			label: "Este mês",
			value: "thisMonth" as DatePeriod,
			icon: "calendar-clear-outline" as const,
		},
		{
			label: "Mês anterior",
			value: "lastMonth" as DatePeriod,
			icon: "arrow-undo-circle-outline" as const,
		},
		{
			label: "Personalizado",
			value: "custom" as DatePeriod,
			icon: "options-outline" as const,
		},
	];

	const PAYMENT_METHODS = [
		{ label: "Todos", value: "" },
		{ label: "Pix", value: "pix" },
		{ label: "Cartão de Crédito", value: "credit_card" },
		{ label: "Cartão de Débito", value: "debit_card" },
		{ label: "Dinheiro", value: "cash" },
		{ label: "Transferência", value: "bank_transfer" },
		{ label: "Convênio", value: "insurance" },
	];

	const CATEGORIES = [
		{ label: "Todas", value: "" },
		{ label: "Avaliação", value: "avaliacao" },
		{ label: "Terapia", value: "terapia" },
		{ label: "Pacote", value: "pacote" },
		{ label: "Outros", value: "outros" },
	];

	const handleDatePeriodChange = (period: DatePeriod) => {
		if (period === "custom") {
			setShowDateModal(true);
			return;
		}

		onFiltersChange({
			...filters,
			datePeriod: period,
			customDateRange: null,
		});
	};

	const handleCustomDateApply = () => {
		onFiltersChange({
			...filters,
			datePeriod: "custom",
			customDateRange: tempDateRange,
		});
		setShowDateModal(false);
	};

	const handleClearFilters = () => {
		onFiltersChange({
			status: "all",
			datePeriod: "month",
			customDateRange: null,
			patientId: undefined,
			paymentMethod: undefined,
			category: undefined,
		});
	};

	return (
		<>
			<Card style={styles.container} padding="md">
				<View style={styles.header}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Filtros
					</Text>
					{hasActiveFilters && (
						<TouchableOpacity
							onPress={handleClearFilters}
							style={styles.clearButton}
						>
							<Text style={[styles.clearButtonText, { color: colors.primary }]}>
								Limpar
							</Text>
							<Ionicons name="close-circle" size={16} color={colors.primary} />
						</TouchableOpacity>
					)}
				</View>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.scrollContainer}
				>
					<View style={styles.chipsContainer}>
						{DATE_PERIODS.map((period) => (
							<TouchableOpacity
								key={period.value}
								style={[
									styles.chip,
									{
										backgroundColor:
											filters.datePeriod === period.value
												? colors.primary + "20"
												: colors.surface,
										borderColor:
											filters.datePeriod === period.value
												? colors.primary
												: colors.border,
									},
								]}
								onPress={() => handleDatePeriodChange(period.value)}
							>
								<Ionicons
									name={period.icon}
									size={16}
									color={
										filters.datePeriod === period.value
											? colors.primary
											: colors.textSecondary
									}
								/>
								<Text
									style={[
										styles.chipText,
										{
											color:
												filters.datePeriod === period.value
													? colors.primary
													: colors.text,
										},
									]}
								>
									{period.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</ScrollView>

				{filters.customDateRange && (
					<View
						style={[
							styles.customDateDisplay,
							{ backgroundColor: colors.primaryLight + "40" },
						]}
					>
						<Ionicons name="calendar" size={14} color={colors.primary} />
						<Text style={[styles.customDateText, { color: colors.primary }]}>
							{format(filters.customDateRange.start, "dd/MM/yyyy")} -{" "}
							{format(filters.customDateRange.end, "dd/MM/yyyy")}
						</Text>
					</View>
				)}

				<View style={styles.additionalFilters}>
					<View style={styles.filterRow}>
						<Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
							Forma de Pagamento:
						</Text>
						<View style={styles.filterChips}>
							{PAYMENT_METHODS.slice(0, 3).map((method) => (
								<TouchableOpacity
									key={method.value}
									style={[
										styles.smallChip,
										{
											backgroundColor:
												filters.paymentMethod === method.value
													? colors.primary + "20"
													: "transparent",
											borderColor:
												filters.paymentMethod === method.value
													? colors.primary
													: colors.border,
										},
									]}
									onPress={() =>
										onFiltersChange({
											...filters,
											paymentMethod: method.value || undefined,
										})
									}
								>
									<Text
										style={[
											styles.smallChipText,
											{
												color:
													filters.paymentMethod === method.value
														? colors.primary
														: colors.text,
											},
										]}
									>
										{method.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</View>
			</Card>

			<RNModal
				visible={showDateModal}
				animationType="slide"
				transparent
				onRequestClose={() => setShowDateModal(false)}
			>
				<SafeAreaView style={styles.modalOverlay}>
					<View
						style={[
							styles.modalContent,
							{ backgroundColor: colors.background },
						]}
					>
						<View
							style={[styles.modalHeader, { borderBottomColor: colors.border }]}
						>
							<Text style={[styles.modalTitle, { color: colors.text }]}>
								Selecione o Período
							</Text>
							<TouchableOpacity onPress={() => setShowDateModal(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						<View style={styles.modalBody}>
							<View style={styles.dateRow}>
								<View style={styles.dateInput}>
									<Text
										style={[styles.dateLabel, { color: colors.textSecondary }]}
									>
										Data Inicial
									</Text>
									<TouchableOpacity
										style={[
											styles.dateButton,
											{
												backgroundColor: colors.surface,
												borderColor: colors.border,
											},
										]}
										onPress={() => {}}
									>
										<Ionicons
											name="calendar-outline"
											size={20}
											color={colors.primary}
										/>
										<Text style={[styles.dateText, { color: colors.text }]}>
											{format(tempDateRange.start, "dd/MM/yyyy")}
										</Text>
									</TouchableOpacity>
								</View>

								<View style={styles.dateInput}>
									<Text
										style={[styles.dateLabel, { color: colors.textSecondary }]}
									>
										Data Final
									</Text>
									<TouchableOpacity
										style={[
											styles.dateButton,
											{
												backgroundColor: colors.surface,
												borderColor: colors.border,
											},
										]}
										onPress={() => {}}
									>
										<Ionicons
											name="calendar-outline"
											size={20}
											color={colors.primary}
										/>
										<Text style={[styles.dateText, { color: colors.text }]}>
											{format(tempDateRange.end, "dd/MM/yyyy")}
										</Text>
									</TouchableOpacity>
								</View>
							</View>

							<TouchableOpacity
								style={[
									styles.applyButton,
									{ backgroundColor: colors.primary },
								]}
								onPress={handleCustomDateApply}
							>
								<Text style={[styles.applyButtonText, { color: "#fff" }]}>
									Aplicar Período
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</SafeAreaView>
			</RNModal>
		</>
	);
}

export function getDateRange(period: DatePeriod): { start: Date; end: Date } {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	switch (period) {
		case "today":
			return { start: today, end: today };
		case "week":
			const weekStart = subDays(today, 7);
			return { start: weekStart, end: today };
		case "month":
			const monthStart = subDays(today, 30);
			return { start: monthStart, end: today };
		case "thisMonth":
			const thisMonthStart = startOfMonth(today);
			const thisMonthEnd = endOfMonth(today);
			return { start: thisMonthStart, end: thisMonthEnd };
		case "lastMonth":
			const lastMonthDate = subMonths(today, 1);
			const lastMonthStart = startOfMonth(lastMonthDate);
			const lastMonthEnd = endOfMonth(lastMonthDate);
			return { start: lastMonthStart, end: lastMonthEnd };
		default:
			return { start: today, end: today };
	}
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "600",
	},
	clearButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	clearButtonText: {
		fontSize: 14,
		fontWeight: "500",
	},
	scrollContainer: {
		marginBottom: 12,
	},
	chipsContainer: {
		flexDirection: "row",
		gap: 8,
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
	},
	chipText: {
		fontSize: 13,
		fontWeight: "500",
	},
	customDateDisplay: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		padding: 8,
		borderRadius: 8,
		marginBottom: 12,
	},
	customDateText: {
		fontSize: 13,
		fontWeight: "500",
	},
	additionalFilters: {
		gap: 12,
	},
	filterRow: {
		gap: 8,
	},
	filterLabel: {
		fontSize: 13,
		fontWeight: "500",
	},
	filterChips: {
		flexDirection: "row",
		gap: 8,
		flexWrap: "wrap",
	},
	smallChip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
	},
	smallChipText: {
		fontSize: 12,
		fontWeight: "500",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	modalContent: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 20,
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		borderBottomWidth: 1,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "600",
	},
	modalBody: {
		padding: 16,
	},
	dateRow: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 20,
	},
	dateInput: {
		flex: 1,
		gap: 6,
	},
	dateLabel: {
		fontSize: 13,
		fontWeight: "500",
	},
	dateButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
	},
	dateText: {
		fontSize: 14,
		fontWeight: "500",
	},
	applyButton: {
		padding: 14,
		borderRadius: 12,
		alignItems: "center",
	},
	applyButtonText: {
		fontSize: 16,
		fontWeight: "600",
	},
});
