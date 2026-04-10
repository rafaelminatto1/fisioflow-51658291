import { useState, useCallback } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	Text,
	Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/auth";
import { useHaptics } from "@/hooks/useHaptics";
import { Button, SyncStatus } from "@/components";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/api";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { fetchApi } from "@/lib/api";
import {
	ProfileHeader,
	ProfileSection,
	ProfileMenuItem,
	SettingsItem,
} from "@/components/profile";

export default function ProfileScreen() {
	const colors = useColors();
	const { user, signOut } = useAuthStore();
	const { status: syncStatus, isOnline } = useSyncStatus();
	const { light, medium, success, error } = useHaptics();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const { data: stats } = useQuery({
		queryKey: ["professionalStats"],
		queryFn: () => getDashboardStats("current-professional"),
	});

	const { data: appointments } = useAppointments();
	const { data: patients } = usePatients({ status: "active" });

	const { data: surveysData } = useQuery({
		queryKey: ["satisfactionSurveysRating"],
		queryFn: async () => {
			try {
				return await fetchApi<any>("/api/satisfaction-surveys", {
					params: { limit: 100 },
				});
			} catch {
				return null;
			}
		},
	});

	const averageRating: number | null = (() => {
		const surveys: any[] = surveysData?.data ?? [];
		if (surveys.length < 5) return null;
		const total = surveys.reduce(
			(sum: number, s: any) => sum + (s.score ?? s.rating ?? 0),
			0,
		);
		return Math.round((total / surveys.length) * 10) / 10;
	})();

	const handleLogout = useCallback(() => {
		medium();
		Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
			{ text: "Cancelar", style: "cancel", onPress: () => light() },
			{
				text: "Sair",
				style: "destructive",
				onPress: async () => {
					setIsLoggingOut(true);
					try {
						await signOut();
						success();
						router.replace("/(auth)/login");
					} catch {
						error();
						Alert.alert("Erro", "Não foi possível sair. Tente novamente.");
					} finally {
						setIsLoggingOut(false);
					}
				},
			},
		]);
	}, [medium, light, signOut, success, error]);

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["left", "right"]}
		>
			<ProfileHeader
				name={user?.name || "Profissional"}
				email={user?.email}
				stats={{
					patients: stats?.activePatients ?? 0,
					appointments: stats?.todayAppointments ?? 0,
					completed: stats?.completedAppointments ?? 0,
				}}
			/>

			<ScrollView contentContainerStyle={styles.scrollContent}>
				<ProfileSection title="Menu Principal">
					<ProfileMenuItem
						icon="person-outline"
						label="Dados Pessoais"
						onPress={() => {
							medium();
							router.push("/profile-edit" as any);
						}}
					/>
					<ProfileMenuItem
						icon="business-outline"
						label="Dados da Clínica"
						onPress={() => {
							medium();
							router.push("/clinic-settings" as any);
						}}
					/>
					<ProfileMenuItem
						icon="clipboard-outline"
						label="Protocolos de Tratamento"
						onPress={() => {
							medium();
							router.push("/protocols" as any);
						}}
					/>
					<ProfileMenuItem
						icon="time-outline"
						label="Horários de Atendimento"
						onPress={() => {
							medium();
							router.push("/working-hours" as any);
						}}
					/>
					<ProfileMenuItem
						icon="notifications-outline"
						label="Notificações"
						onPress={() => {
							medium();
							router.push("/notification-preferences" as any);
						}}
					/>
					<ProfileMenuItem
						icon="lock-closed-outline"
						label="Alterar Senha"
						onPress={() => {
							medium();
							router.push("/change-password" as any);
						}}
					/>
				</ProfileSection>

				<ProfileSection title="Sistema">
					<ProfileMenuItem
						icon="card-outline"
						label="Plano e Faturamento"
						onPress={() => {
							light();
							Linking.openURL("https://fisioflow.pages.dev/financial").catch(
								() => Alert.alert("Erro", "Não foi possível abrir o link."),
							);
						}}
					/>
					<ProfileMenuItem
						icon="help-circle-outline"
						label="Ajuda e Suporte"
						onPress={() => {
							medium();
							router.push("/help" as any);
						}}
					/>
				</ProfileSection>

				<ProfileSection title="Sincronização">
					<View style={styles.syncInfo}>
						<View
							style={[
								styles.syncStatus,
								{
									backgroundColor: isOnline
										? colors.successLight
										: colors.errorLight,
								},
							]}
						>
							<Ionicons
								name={isOnline ? "checkmark-circle" : "cloud-offline-outline"}
								size={16}
								color={isOnline ? colors.success : colors.error}
							/>
						</View>
						<Text style={[styles.syncText, { color: colors.text }]}>
							{isOnline ? "Sincronização ativa" : "Sem conexão"}
						</Text>
					</View>
					{averageRating && (
						<View style={styles.ratingInfo}>
							<View style={styles.ratingIcon}>
								<Ionicons name="star" size={16} color={colors.warning} />
							</View>
							<Text style={[styles.ratingText, { color: colors.text }]}>
								{averageRating.toFixed(1)} média de satisfação
							</Text>
						</View>
					)}
				</ProfileSection>

				<ProfileSection title="Opções">
					<SettingsItem
						label="Notificações Push"
						value={true}
						onToggle={() => medium()}
					/>
					<SettingsItem
						label="Lembrete de atividades"
						value={true}
						onToggle={() => medium()}
					/>
					<SettingsItem
						label="Modo Escuro"
						value={false}
						onToggle={() => medium()}
					/>
				</ProfileSection>

				<View style={styles.logoutSection}>
					<Button
						title={isLoggingOut ? "Saindo..." : "Sair da Conta"}
						onPress={handleLogout}
						variant="destructive"
						size="lg"
						leftIcon="log-out-outline"
						loading={isLoggingOut}
					/>
				</View>

				<View style={styles.version}>
					<Text style={[styles.versionText, { color: colors.textMuted }]}>
						FisioFlow v1.0.0
					</Text>
				</View>
			</ScrollView>

			<View
				style={[
					styles.bottomBar,
					{ backgroundColor: colors.background, borderTopColor: colors.border },
				]}
			>
				<SyncStatus status={syncStatus} isOnline={isOnline} />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		padding: 14,
		paddingBottom: 100,
	},
	syncInfo: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 6,
	},
	syncStatus: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	syncText: {
		fontSize: 13,
		fontWeight: "500",
	},
	ratingInfo: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingVertical: 10,
	},
	ratingIcon: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(251, 191, 36, 0.1)",
	},
	ratingText: {
		fontSize: 13,
	},
	logoutSection: {
		marginTop: 24,
		marginBottom: 14,
	},
	version: {
		alignItems: "center",
		paddingVertical: 20,
	},
	versionText: {
		fontSize: 11,
	},
	bottomBar: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		padding: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderTopWidth: 1,
	},
});
