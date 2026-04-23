import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	Image,
	TouchableOpacity,
	Alert,
	Linking,
	Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { getExerciseById } from "@/lib/api";
import { useColors } from "@/hooks/useColorScheme";
import { useExerciseFavorites } from "@/hooks/useExerciseFavorites";
import { Button } from "@/components";
import { useHaptics } from "@/hooks/useHaptics";

type ScientificReference = {
	title?: string;
	url?: string;
};

export default function ExerciseDetailScreen() {
	const { id } = useLocalSearchParams();
	const router = useRouter();
	const colors = useColors();
	const { medium } = useHaptics();
	const { isFavorite, toggleFavorite, isToggling } = useExerciseFavorites();
	const [zoomVisible, setZoomVisible] = useState(false);

	const {
		data: exercise,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["exercise", id],
		queryFn: () => getExerciseById(id as string),
		enabled: !!id,
	});

	if (isLoading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		);
	}

	if (error || !exercise) {
		return (
			<View style={styles.centered}>
				<Text style={{ color: colors.text }}>Exercício não encontrado.</Text>
				<Button title="Voltar" onPress={() => router.back()} />
			</View>
		);
	}

	const scientificReferences: ScientificReference[] = Array.isArray(
		exercise.scientific_references,
	)
		? exercise.scientific_references
		: typeof exercise.scientific_references === "string"
			? (() => {
					try {
						const parsed = JSON.parse(exercise.scientific_references);
						return Array.isArray(parsed) ? parsed : [];
					} catch {
						return [];
					}
				})()
			: [];

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["left", "right"]}
		>
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<Text
					style={[styles.headerTitle, { color: colors.text }]}
					numberOfLines={1}
				>
					{exercise.name}
				</Text>
				<View style={styles.headerActions}>
					<TouchableOpacity
						style={styles.headerFavoriteBtn}
						onPress={() => {
							medium();
							toggleFavorite(id as string);
						}}
						disabled={isToggling}
					>
						<Ionicons
							name={isFavorite(id as string) ? "heart" : "heart-outline"}
							size={24}
							color={isFavorite(id as string) ? colors.error : colors.primary}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => {
							medium();
							router.push(`/exercise-form?id=${id}`);
						}}
					>
						<Ionicons name="create-outline" size={24} color={colors.primary} />
					</TouchableOpacity>
				</View>
			</View>
			<ScrollView>
				{exercise.imageUrl && (
					<TouchableOpacity activeOpacity={0.9} onPress={() => setZoomVisible(true)}>
						<Image source={{ uri: exercise.imageUrl }} style={styles.image} resizeMode="contain" />
						<View style={styles.zoomBadge}>
							<Ionicons name="expand-outline" size={20} color="#fff" />
						</View>
					</TouchableOpacity>
				)}
				<View style={styles.content}>
					<View style={styles.titleRow}>
						<Text style={[styles.title, { color: colors.text }]}>
							{exercise.name}
						</Text>
						{exercise.precaution_level && (
							<View
								style={[
									styles.precautionBadge,
									{
										backgroundColor:
											exercise.precaution_level === "restricted"
												? colors.error
												: exercise.precaution_level === "supervised"
													? colors.warning
													: colors.success,
									},
								]}
							>
								<Text style={styles.precautionText}>
									{exercise.precaution_level === "restricted"
										? "Restrito"
										: exercise.precaution_level === "supervised"
											? "Supervisionado"
											: "Seguro"}
								</Text>
							</View>
						)}
					</View>

					{exercise.description && (
						<Text style={[styles.description, { color: colors.textSecondary }]}>
							{exercise.description}
						</Text>
					)}

					<View style={styles.metaContainer}>
						<View style={[styles.metaTag, { backgroundColor: colors.surface }]}>
							<Text style={styles.metaText}>
								Categoria: {exercise.category}
							</Text>
						</View>
						<View style={[styles.metaTag, { backgroundColor: colors.surface }]}>
							<Text style={styles.metaText}>
								Dificuldade: {exercise.difficulty}
							</Text>
						</View>
					</View>

					{exercise.precaution_notes && (
						<View style={[styles.precautionNotes, { borderColor: colors.warning }]}>
							<Ionicons name="warning-outline" size={18} color={colors.warning} />
							<Text style={[styles.precautionNotesText, { color: colors.text }]}>
								{exercise.precaution_notes}
							</Text>
						</View>
					)}

					{exercise.instructions && Array.isArray(exercise.instructions) && exercise.instructions.length > 0 && (
						<View style={styles.section}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>
								Passo a Passo
							</Text>
							{exercise.instructions.map((inst: string, index: number) => (
								<View key={index} style={styles.instructionItem}>
									<Text style={[styles.stepNumber, { color: colors.primary }]}>{index + 1}</Text>
									<Text style={[styles.instructionText, { color: colors.textSecondary }]}>
										{inst}
									</Text>
								</View>
							))}
						</View>
					)}

					{exercise.indicated_pathologies && exercise.indicated_pathologies.length > 0 && (
						<View style={styles.section}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>
								Indicações
							</Text>
							<View style={styles.pathologyContainer}>
								{exercise.indicated_pathologies.map((path, idx) => (
									<View key={idx} style={[styles.pathologyTag, { backgroundColor: colors.surface }]}>
										<Text style={[styles.pathologyText, { color: colors.text }]}>{path}</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{scientificReferences.length > 0 && (
						<View style={styles.section}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>
								Base Científica
							</Text>
							{scientificReferences.map((ref, idx) => (
								<TouchableOpacity
									key={idx}
									style={[styles.referenceCard, { backgroundColor: colors.surface }]}
									onPress={() => ref.url && Linking.openURL(ref.url)}
								>
									<Ionicons name="book-outline" size={20} color={colors.primary} />
									<View style={{ flex: 1 }}>
										<Text style={[styles.referenceTitle, { color: colors.text }]} numberOfLines={2}>
											{ref.title || 'Referência sem título'}
										</Text>
										{ref.url && <Text style={{ color: colors.primary, fontSize: 12 }}>Ver Evidência</Text>}
									</View>
								</TouchableOpacity>
							))}
						</View>
					)}

					{exercise.videoUrl && (
						<View style={styles.section}>
							<Button
								title="Assistir Demonstração"
								onPress={() =>
									Linking.openURL(exercise.videoUrl!).catch(() =>
										Alert.alert("Erro", "Não foi possível abrir o vídeo."),
									)
								}
								leftIcon="logo-youtube"
							/>
						</View>
					)}
				</View>
			</ScrollView>

					<Modal visible={zoomVisible} transparent animationType="fade">
						<SafeAreaView style={styles.zoomContainer}>
							<TouchableOpacity style={styles.closeZoom} onPress={() => setZoomVisible(false)}>
								<Ionicons name="close" size={30} color="#fff" />
							</TouchableOpacity>
							<Image
								source={{ uri: exercise.imageUrl }}
								style={styles.fullImage}
								resizeMode="contain"
							/>
						</SafeAreaView>
					</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		borderBottomWidth: 1,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
		flex: 1,
		marginHorizontal: 16,
		textAlign: "center",
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	headerFavoriteBtn: {
		padding: 4,
	},
	image: {
		width: "100%",
		height: 250,
	},
	content: {
		padding: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 8,
	},
	description: {
		fontSize: 16,
		lineHeight: 24,
		marginBottom: 16,
	},
	metaContainer: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 16,
	},
	metaTag: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
	},
	metaText: {
		fontSize: 14,
		fontWeight: "500",
	},
	section: {
		marginTop: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 8,
	},
	instruction: {
		fontSize: 16,
		lineHeight: 24,
		marginBottom: 4,
	},
	zoomBadge: {
		position: "absolute",
		bottom: 16,
		right: 16,
		backgroundColor: "rgba(0,0,0,0.5)",
		padding: 8,
		borderRadius: 20,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 8,
		flexWrap: "wrap",
		gap: 8,
	},
	precautionBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},
	precautionText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "bold",
	},
	precautionNotes: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "rgba(255, 193, 7, 0.1)",
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 20,
	},
	precautionNotesText: {
		fontSize: 14,
		flex: 1,
	},
	instructionItem: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 12,
	},
	stepNumber: {
		fontSize: 16,
		fontWeight: "bold",
		width: 24,
	},
	instructionText: {
		fontSize: 16,
		lineHeight: 24,
		flex: 1,
	},
	pathologyContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	pathologyTag: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
	},
	pathologyText: {
		fontSize: 14,
	},
	referenceCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		padding: 12,
		borderRadius: 12,
		marginBottom: 8,
	},
	referenceTitle: {
		fontSize: 14,
		fontWeight: "500",
	},
	zoomContainer: {
		flex: 1,
		backgroundColor: "#000",
		justifyContent: "center",
		alignItems: "center",
	},
	closeZoom: {
		position: "absolute",
		top: 50,
		right: 20,
		zIndex: 10,
	},
	fullImage: {
		width: "100%",
		height: "80%",
	},
});
