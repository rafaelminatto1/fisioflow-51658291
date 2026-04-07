import { useState, useMemo, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
	RefreshControl,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import {
	useAllFinancialRecords,
	useDeleteFinancialRecord,
} from "@/hooks/usePatientFinancial";
import {
	useNFSeList,
	NFSE_STATUS_LABELS,
	NFSE_STATUS_COLORS,
} from "@/hooks/useNFSe";
import {
	FinancialFilters,
	getDateRange,
	type FinancialFilters as FinancialFiltersType,
	DeleteConfirmationModal,
	FinancialChart,
	PaymentNotifications,
	TransactionCard,
	FinancialSummaryGrid,
	EmptyStateFinancial,
} from "@/components/financial";
import { TransactionListSkeleton } from "@/components/ui/Skeleton";
import { format } from "date-fns";
import { useHaptics } from "@/hooks/useHaptics";
import { useQueryClient } from "@tanstack/react-query";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
	credit_card: "Cartão de Crédito",
	debit_card: "Cartão de Débito",
	pix: "Pix",
	cash: "Dinheiro",
	bank_transfer: "Transferência",
	insurance: "Convênio",
};

function formatPaymentMethod(method?: string | null): string {
	if (!method) return "Outro";
	return PAYMENT_METHOD_LABELS[method] ?? method;
}

export default function FinancialsScreen() {
	const colors = useColors();
	const router = useRouter();
	const { light, medium, success, error: hapticError } = useHaptics();
	const queryClient = useQueryClient();

	const [activeTab, setActiveTab] = useState<
		"transactions" | "nfse" | "receipts"
	>("transactions");
	const [filters, setFilters] = useState<FinancialFiltersType>({
		status: "all",
		datePeriod: "month",
		customDateRange: null,
		patientId: undefined,
		paymentMethod: undefined,
	});

	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [recordToDelete, setRecordToDelete] = useState<any>(null);

	const queryOptions = useMemo(() => {
		const dateRange =
			filters.customDateRange || getDateRange(filters.datePeriod);
		return {
			startDate: format(dateRange.start, "yyyy-MM-dd"),
			endDate: format(dateRange.end, "yyyy-MM-dd"),
		};
	}, [filters.datePeriod, filters.customDateRange]);

	const {
		data: records,
		isLoading,
		refetch,
	} = useAllFinancialRecords(queryOptions);
	const {
		data: nfseRecords = [],
		isLoading: isLoadingNFSe,
		refetch: refetchNFSe,
	} = useNFSeList();
	const deleteMutation = useDeleteFinancialRecord();

	const filteredRecords = useMemo(() => {
		if (!records) return [];

		let result = [...records];

		if (filters.status !== "all") {
			result = result.filter((r) => r.payment_status === filters.status);
		}

		if (filters.paymentMethod) {
			result = result.filter((r) => r.payment_method === filters.paymentMethod);
		}

		if (filters.patientId) {
			result = result.filter((r) => r.patient_id === filters.patientId);
		}

		return result;
	}, [records, filters]);

	const totalRevenue =
		records?.reduce(
			(acc, record) =>
				acc + (record.payment_status === "paid" ? record.final_value : 0),
			0,
		) || 0;
	const totalPending =
		records?.reduce(
			(acc, record) =>
				acc + (record.payment_status === "pending" ? record.final_value : 0),
			0,
		) || 0;

	const pendingCount = filteredRecords.filter(
		(r) => r.payment_status === "pending",
	).length;
	const paidCount = filteredRecords.filter(
		(r) => r.payment_status === "paid",
	).length;

	const hasActiveFilters = useMemo(() => {
		return (
			filters.status !== "all" ||
			filters.datePeriod !== "month" ||
			filters.paymentMethod !== undefined ||
			filters.patientId !== undefined
		);
	}, [filters]);

	const handleRefresh = useCallback(async () => {
		light();
		await refetch();
	}, [light, refetch]);

	const handleAdd = useCallback(() => {
		medium();
		if (activeTab === "nfse") {
			router.push("/nfse-form");
		} else {
			router.push("/financial-form");
		}
	}, [medium, activeTab]);

	const handleEdit = useCallback(
		(record: any) => {
			medium();
			router.push({
				pathname: "/financial-form",
				params: {
					id: record.id,
					patientId: record.patient_id,
					amount: Math.round(record.final_value * 100),
					date: record.session_date,
					description: record.notes,
					paymentMethod: record.payment_method,
					status: record.payment_status,
				},
			});
		},
		[medium],
	);

	const handleDeletePress = useCallback(
		(record: any, e: any) => {
			e?.stopPropagation();
			medium();
			setRecordToDelete(record);
			setDeleteModalVisible(true);
		},
		[medium],
	);

	const handleDeleteConfirm = useCallback(async () => {
		if (!recordToDelete) return;

		try {
			await deleteMutation.mutateAsync(recordToDelete.id);
			success();
			queryClient.invalidateQueries({ queryKey: ["allFinancialRecords"] });
			Alert.alert("Sucesso", "Registro excluído com sucesso!");
		} catch (err) {
			hapticError();
			Alert.alert("Erro", "Falha ao excluir registro.");
		}

		setDeleteModalVisible(false);
		setRecordToDelete(null);
	}, [recordToDelete, deleteMutation, success, hapticError, queryClient]);

	const chartData = useMemo(() => {
		if (!records || records.length === 0) return [];

		const byDate = new Map<string, number>();
		records.forEach((r) => {
			const date = format(new Date(r.session_date), "dd/MM");
			const current = byDate.get(date) || 0;
			byDate.set(
				date,
				current + (r.payment_status === "paid" ? r.final_value : 0),
			);
		});

		return Array.from(byDate.entries()).map(([date, value]) => ({
			date,
			value,
			label: date,
		}));
	}, [records]);

	const getDatePeriodLabel = () => {
		const labels: Record<FinancialFiltersType["datePeriod"], string> = {
			today: "Hoje",
			week: "Última semana",
			month: "Últimos 30 dias",
			thisMonth: "Este mês",
			lastMonth: "Mês anterior",
			custom: "Personalizado",
		};
		return labels[filters.datePeriod];
	};

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top"]}
		>
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<Text style={[styles.headerTitle, { color: colors.text }]}>
					Financeiro
				</Text>
			</View>

			<View style={styles.tabContainer}>
				<TouchableOpacity
					style={[
						styles.tab,
						activeTab === "transactions" && {
							borderBottomColor: colors.primary,
							borderBottomWidth: 2,
						},
					]}
					onPress={() => {
						light();
						setActiveTab("transactions");
					}}
				>
					<Text
						style={[
							styles.tabText,
							{
								color:
									activeTab === "transactions"
										? colors.primary
										: colors.textSecondary,
							},
						]}
					>
						Transações
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.tab,
						activeTab === "nfse" && {
							borderBottomColor: colors.primary,
							borderBottomWidth: 2,
						},
					]}
					onPress={() => {
						light();
						setActiveTab("nfse");
					}}
				>
					<Text
						style={[
							styles.tabText,
							{
								color:
									activeTab === "nfse" ? colors.primary : colors.textSecondary,
							},
						]}
					>
						NFS-e
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.tab,
						activeTab === "receipts" && {
							borderBottomColor: colors.primary,
							borderBottomWidth: 2,
						},
					]}
					onPress={() => {
						light();
						setActiveTab("receipts");
					}}
				>
					<Text
						style={[
							styles.tabText,
							{
								color:
									activeTab === "receipts"
										? colors.primary
										: colors.textSecondary,
							},
						]}
					>
						Recibos
					</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scroll}
				refreshControl={
					<RefreshControl
						refreshing={activeTab === "nfse" ? isLoadingNFSe : isLoading}
						onRefresh={activeTab === "nfse" ? refetchNFSe : handleRefresh}
						tintColor={colors.primary}
					/>
				}
			>
				{activeTab === "transactions" ? (
					<>
						<PaymentNotifications
							pendingCount={pendingCount}
							overdueCount={0}
							totalPending={totalPending}
						/>

						<FinancialFilters
							filters={filters}
							onFiltersChange={setFilters}
							hasActiveFilters={hasActiveFilters}
						/>

						<FinancialSummaryGrid
							cards={[
								{
									title: "Receita",
									amount: totalRevenue,
									subtitle: `(${getDatePeriodLabel()})`,
									trend: {
										value: 12.5,
										label: "vs mês anterior",
										positive: true,
									},
									icon: "arrow-up-circle" as any,
									variant: "success",
								},
								{
									title: "Pendente",
									amount: totalPending,
									subtitle: `(${getDatePeriodLabel()})`,
									trend: {
										value: 8.3,
										label: "vs mês anterior",
										positive: false,
									},
									icon: "time" as any,
									variant: "warning",
								},
							]}
						/>

						{chartData.length > 0 && (
							<FinancialChart
								data={chartData}
								title="Evolução de Receitas"
								type="line"
								showDots={true}
							/>
						)}

						<View
							style={[styles.listHeader, { borderBottomColor: colors.border }]}
						>
							<Text style={[styles.listHeaderTitle, { color: colors.text }]}>
								Transações ({filteredRecords.length})
							</Text>
						</View>

						{isLoading && !records ? (
							<TransactionListSkeleton count={3} />
						) : filteredRecords.length > 0 ? (
							filteredRecords.map((record) => (
								<TransactionCard
									key={record.id}
									id={record.id}
									patientName={record.patient_name}
									amount={record.final_value}
									date={record.session_date}
									paymentMethod={record.payment_method}
									status={record.payment_status}
									onEdit={() => handleEdit(record)}
									onDelete={(e) => handleDeletePress(record, e)}
									onReceipt={(e) => {
										e?.stopPropagation();
										light();
									}}
								/>
							))
						) : (
							<EmptyStateFinancial
								title={
									hasActiveFilters
										? "Nenhum registro encontrado"
										: "Nenhuma transação encontrada"
								}
								description={
									hasActiveFilters
										? "Tente ajustar os filtros para encontrar transações."
										: "Adicione sua primeira transação para começar."
								}
								actionLabel="Adicionar Transação"
								onAction={handleAdd}
								illustration="transactions"
								variant={hasActiveFilters ? "no-results" : "initial"}
							/>
						)}
					</>
				) : activeTab === "nfse" ? (
					<>
						{isLoadingNFSe ? (
							<TransactionListSkeleton count={3} />
						) : nfseRecords.length === 0 ? (
							<EmptyStateFinancial
								title="Nenhuma NFS-e emitida"
								description="Toque em + para emitir sua primeira nota fiscal."
								actionLabel="Emitir NFS-e"
								onAction={handleAdd}
								illustration="nfse"
								variant="initial"
							/>
						) : (
							nfseRecords.map((nfse) => (
								<View key={nfse.id} style={styles.nfseCard}>
									<View style={styles.nfseHeader}>
										<View>
											<Text style={[styles.nfseTitle, { color: colors.text }]}>
												{nfse.tomador_nome || "Sem tomador"}
											</Text>
											<Text
												style={[
													styles.nfseDate,
													{ color: colors.textSecondary },
												]}
											>
												{format(new Date(nfse.data_emissao), "dd/MM/yyyy")} •
												RPS {nfse.numero_rps}
											</Text>
										</View>
										<View
											style={[
												styles.nfseBadge,
												{
													backgroundColor:
														(NFSE_STATUS_COLORS[nfse.status] ?? "#9CA3AF") +
														"20",
												},
											]}
										>
											<Text
												style={[
													styles.nfseBadgeText,
													{
														color: NFSE_STATUS_COLORS[nfse.status] ?? "#9CA3AF",
													},
												]}
											>
												{NFSE_STATUS_LABELS[nfse.status]}
											</Text>
										</View>
									</View>
									<View
										style={[
											styles.nfseFooter,
											{ borderTopColor: colors.border },
										]}
									>
										<Text style={[styles.nfseValue, { color: colors.text }]}>
											R${" "}
											{nfse.valor_servico.toLocaleString("pt-BR", {
												minimumFractionDigits: 2,
											})}
										</Text>
										{nfse.link_nfse ? (
											<Ionicons
												name="open-outline"
												size={20}
												color={colors.primary}
											/>
										) : null}
									</View>
								</View>
							))
						)}
					</>
				) : (
					<EmptyStateFinancial
						title="Nenhum recibo emitido"
						description="Os recibos emitidos aparecerão aqui."
						illustration="receipts"
						variant="initial"
					/>
				)}
				<View style={{ height: 80 }} />
			</ScrollView>

			<DeleteConfirmationModal
				visible={deleteModalVisible}
				onClose={() => setDeleteModalVisible(false)}
				onConfirm={handleDeleteConfirm}
				recordInfo={
					recordToDelete
						? {
								patientName: recordToDelete.patient_name,
								amount: recordToDelete.final_value,
								date: format(
									new Date(recordToDelete.session_date),
									"dd/MM/yyyy",
								),
							}
						: undefined
				}
			/>

			<TouchableOpacity
				style={[styles.fab, { backgroundColor: colors.primary }]}
				onPress={handleAdd}
				activeOpacity={0.8}
			>
				<Ionicons name="add" size={32} color="#fff" />
			</TouchableOpacity>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 16,
		borderBottomWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
	},
	tabContainer: {
		flexDirection: "row",
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0,0,0,0.05)",
	},
	tab: {
		paddingVertical: 12,
		marginRight: 24,
	},
	tabText: {
		fontSize: 15,
		fontWeight: "600",
	},
	scroll: {
		flex: 1,
		padding: 16,
	},
	listHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
		marginBottom: 12,
		borderBottomWidth: 1,
	},
	listHeaderTitle: {
		fontSize: 16,
		fontWeight: "600",
	},
	nfseCard: {
		padding: 16,
		marginBottom: 12,
		backgroundColor: "#fff",
		borderRadius: 16,
		borderWidth: 1,
	},
	nfseHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 12,
	},
	nfseTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 4,
	},
	nfseDate: {
		fontSize: 13,
	},
	nfseBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	nfseBadgeText: {
		fontSize: 12,
		fontWeight: "600",
	},
	nfseFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 12,
		borderTopWidth: 1,
	},
	nfseValue: {
		fontSize: 18,
		fontWeight: "bold",
	},
	fab: {
		position: "absolute",
		bottom: 24,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
});
