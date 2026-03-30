import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import {
	ActionSheetIOS,
	ActivityIndicator,
	Alert,
	Platform,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { Card } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useLeads } from "@/hooks/useLeads";
import { ApiLead } from "@/lib/api";

const STATUS_LABELS: Record<ApiLead['estagio'], string> = {
	aguardando: "Novo",
	contatado: "Em Contato",
	interessado: "Interessado",
	agendado: "Agendado",
	convertido: "Convertido",
	perdido: "Perdido",
};

const STATUS_COLORS: Record<ApiLead['estagio'], string> = {
	aguardando: "#3b82f6",
	contatado: "#8b5cf6",
	interessado: "#f59e0b",
	agendado: "#10b981",
	convertido: "#059669",
	perdido: "#ef4444",
};

const LeadCard = memo(({ lead, colors, light, onUpdateStatus }: any) => {
	const handleLongPress = () => {
		light();
		const stages = Object.keys(STATUS_LABELS) as ApiLead['estagio'][];
		const options = stages.map(s => STATUS_LABELS[s]);
		if (Platform.OS === 'ios') {
			ActionSheetIOS.showActionSheetWithOptions(
				{ options: [...options, 'Cancelar'], cancelButtonIndex: options.length, title: 'Mover para etapa' },
				(idx) => { if (idx < options.length) onUpdateStatus(lead.id, stages[idx]); }
			);
		} else {
			Alert.alert('Mover para etapa', undefined,
				stages.map(s => ({ text: STATUS_LABELS[s], onPress: () => onUpdateStatus(lead.id, s) }))
					.concat([{ text: 'Cancelar', style: 'cancel' } as any])
			);
		}
	};
	return (
	<TouchableOpacity
		activeOpacity={0.7}
		onPress={() => light()}
		onLongPress={handleLongPress}
		delayLongPress={400}
	>
		<Card style={styles.leadCard}>
			<View style={styles.leadHeader}>
				<View style={styles.leadMainInfo}>
					<Text style={[styles.leadName, { color: colors.text }]} numberOfLines={1}>
						{lead.nome}
					</Text>
					<View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[lead.estagio] + "20" }]}>
						<Text style={[styles.statusText, { color: STATUS_COLORS[lead.estagio] }]}>
							{STATUS_LABELS[lead.estagio]}
						</Text>
					</View>
				</View>
				<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
			</View>

			<View style={styles.leadDetails}>
				{lead.telefone && (
					<View style={styles.detailItem}>
						<Ionicons name="call-outline" size={14} color={colors.textSecondary} />
						<Text style={[styles.detailText, { color: colors.textSecondary }]}>{lead.telefone}</Text>
					</View>
				)}
				{lead.origem && (
					<View style={styles.detailItem}>
						<Ionicons name="share-social-outline" size={14} color={colors.textSecondary} />
						<Text style={[styles.detailText, { color: colors.textSecondary }]}>{lead.origem}</Text>
					</View>
				)}
			</View>

			{lead.interesse && (
				<Text style={[styles.interestText, { color: colors.textMuted }]} numberOfLines={2}>
					Interesse: {lead.interesse}
				</Text>
			)}
		</Card>
	</TouchableOpacity>
	);
});

export default function CRMScreen() {
	const colors = useColors();
	const { light } = useHaptics();
	const { leads, loading, refreshing, refresh, updateLeadStatus } = useLeads();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedStatus, setSelectedStatus] = useState<ApiLead['estagio'] | "todos">("todos");

	const filteredLeads = useMemo(() => {
		return leads.filter((lead) => {
			const matchesSearch = lead.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(lead.telefone && lead.telefone.includes(searchQuery)) ||
				(lead.interesse && lead.interesse.toLowerCase().includes(searchQuery.toLowerCase()));
			
			const matchesStatus = selectedStatus === "todos" || lead.estagio === selectedStatus;
			
			return matchesSearch && matchesStatus;
		});
	}, [leads, searchQuery, selectedStatus]);

	const statusOptions = ["todos", ...Object.keys(STATUS_LABELS)] as const;

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
				<View style={[styles.searchBar, { backgroundColor: colors.surfaceHover }]}>
					<Ionicons name="search" size={20} color={colors.textMuted} />
					<TextInput
						placeholder="Buscar leads..."
						placeholderTextColor={colors.textMuted}
						style={[styles.searchInput, { color: colors.text }]}
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery("")}>
							<Ionicons name="close-circle" size={20} color={colors.textMuted} />
						</TouchableOpacity>
					)}
				</View>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.statusFilters}
				>
					{statusOptions.map((status) => (
						<TouchableOpacity
							key={status}
							onPress={() => {
								light();
								setSelectedStatus(status);
							}}
							style={[
								styles.statusFilterChip,
								{
									backgroundColor: selectedStatus === status ? colors.primary : colors.surfaceHover,
								},
							]}
						>
							<Text
								style={[
									styles.statusFilterText,
									{
										color: selectedStatus === status ? "#fff" : colors.textSecondary,
									},
								]}
							>
								{status === "todos" ? "Todos" : STATUS_LABELS[status as ApiLead['estagio']]}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={refresh}
						tintColor={colors.primary}
					/>
				}
			>
				{loading && !refreshing ? (
					<ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
				) : filteredLeads.length > 0 ? (
					filteredLeads.map((lead) => (
						<LeadCard key={lead.id} lead={lead} colors={colors} light={light} onUpdateStatus={updateLeadStatus} />
					))
				) : (
					<View style={styles.emptyContainer}>
						<Ionicons name="funnel-outline" size={64} color={colors.textMuted} />
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
							Nenhum lead encontrado
						</Text>
					</View>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	searchContainer: {
		padding: 16,
		borderBottomWidth: 1,
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		height: 44,
		borderRadius: 12,
		marginBottom: 12,
	},
	searchInput: {
		flex: 1,
		marginLeft: 8,
		fontSize: 16,
	},
	statusFilters: {
		flexDirection: "row",
		paddingBottom: 4,
	},
	statusFilterChip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		marginRight: 8,
	},
	statusFilterText: {
		fontSize: 14,
		fontWeight: "600",
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
	},
	leadCard: {
		marginBottom: 12,
		padding: 16,
	},
	leadHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	leadMainInfo: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
	},
	leadName: {
		fontSize: 18,
		fontWeight: "bold",
		marginRight: 8,
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "bold",
	},
	leadDetails: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginBottom: 8,
	},
	detailItem: {
		flexDirection: "row",
		alignItems: "center",
		marginRight: 16,
		marginBottom: 4,
	},
	detailText: {
		fontSize: 14,
		marginLeft: 4,
	},
	interestText: {
		fontSize: 14,
		fontStyle: "italic",
	},
	loader: {
		marginTop: 40,
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		marginTop: 80,
	},
	emptyText: {
		fontSize: 16,
		marginTop: 16,
	},
});
