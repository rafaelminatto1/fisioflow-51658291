import { useState } from "react";

import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	RefreshControl,
	ActivityIndicator,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/auth";
import {
	Card,
	VideoModal,
	SyncIndicator,
	ExerciseFeedbackModal,
	ExerciseFeedback,
} from "@/components";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Spacing } from "@/constants/spacing";
import { GamificationService } from "@/services/GamificationService";
import { useExercises, useCompleteExercise } from "@/hooks/useExercises";
import { ExerciseAssignment } from "@/types/api";
import { log } from "@/lib/logger";

export default function ExercisesScreen() {
	const colors = useColors();
	const { user } = useAuthStore();
	const [selectedVideo, setSelectedVideo] = useState<{
		uri: string;
		title: string;
		description?: string;
	} | null>(null);
	const [feedbackExercise, setFeedbackExercise] =
		useState<ExerciseAssignment | null>(null);
	const [showFeedbackModal, setShowFeedbackModal] = useState(false);
	const { isOnline, queueOperation } = useOfflineSync();

	const {
		data: exercises = [],
		isLoading,
		isRefetching,
		refetch,
	} = useExercises();
	const completeMutation = useCompleteExercise();

	const onRefresh = async () => {
		await refetch();
	};

	const toggleExercise = async (assignment: ExerciseAssignment) => {
		if (!user?.id) return;

		// If completing (not uncompleting), show feedback modal first
		if (!assignment.completed) {
			setFeedbackExercise(assignment);
			setShowFeedbackModal(true);
			return;
		}

		try {
			const newCompletedState = !assignment.completed;

			if (isOnline) {
				await completeMutation.mutateAsync({
					assignmentId: assignment.id,
					data: { completed: newCompletedState },
				});

				if (newCompletedState) {
					await GamificationService.awardExerciseCompletion(
						user.id,
						assignment.id,
					);
				}
			} else {
				await queueOperation("complete_exercise", {
					assignmentId: assignment.id,
					completed: newCompletedState,
				});

				Alert.alert(
					"Salvo Localmente",
					"As alterações serão sincronizadas quando você reconectar.",
				);
			}
		} catch (error) {
			log.error("Error toggling exercise:", error);
			Alert.alert("Erro", "Não foi possível atualizar o exercício.");
		}
	};

	const handleFeedbackSubmit = async (feedback: ExerciseFeedback) => {
		if (!feedbackExercise || !user?.id) return;

		try {
			if (isOnline) {
				await completeMutation.mutateAsync({
					assignmentId: feedbackExercise.id,
					data: {
						completed: true,
						...feedback,
					},
				});

				await GamificationService.awardExerciseCompletion(
					user.id,
					feedbackExercise.id,
				);
			} else {
				await queueOperation("complete_exercise", {
					assignmentId: feedbackExercise.id,
					completed: true,
				});

				await queueOperation("submit_feedback", {
					assignmentId: feedbackExercise.id,
					...feedback,
				});

				Alert.alert(
					"Salvo Localmente",
					"As alterações serão sincronizadas quando você reconectar.",
				);
			}
		} catch (error) {
			log.error("Error submitting feedback:", error);
			Alert.alert("Erro", "Não foi possível salvar o feedback.");
		} finally {
			setFeedbackExercise(null);
			setShowFeedbackModal(false);
		}
	};

	const openVideo = (assignment: ExerciseAssignment) => {
		if (assignment.exercise?.videoUrl) {
			setSelectedVideo({
				uri: assignment.exercise.videoUrl,
				title: assignment.exercise.name,
				description: assignment.exercise.description,
			});
		}
	};

	if (isLoading && !isRefetching) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor: colors.background }]}
				edges={["top", "left", "right"]}
			>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={[styles.loadingText, { color: colors.textSecondary }]}>
						Carregando exercícios...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (exercises.length === 0) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor: colors.background }]}
				edges={["top", "left", "right"]}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					refreshControl={
						<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
					}
				>
					<View style={styles.emptyState}>
						<Ionicons
							name="barbell-outline"
							size={64}
							color={colors.textMuted}
						/>
						<Text style={[styles.emptyTitle, { color: colors.text }]}>
							Nenhum exercício ainda
						</Text>
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
							Seu fisioterapeuta irá prescrever exercícios em breve
						</Text>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}

	const completedCount = exercises.filter((e) => e.completed).length;
	const totalCount = exercises.length;
	const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top", "left", "right"]}
		>
			{/* Page Title */}
			<View style={styles.pageHeader}>
				<Text style={[styles.pageTitle, { color: colors.text }]}>
					Exercícios
				</Text>
			</View>

			{/* Sync Indicator */}
			<SyncIndicator />

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
				}
			>
				{/* Progress Card */}
				<Card style={styles.progressCard}>
					<View style={styles.progressHeader}>
						<Text style={[styles.progressTitle, { color: colors.text }]}>
							Progresso de Hoje
						</Text>
						<Text style={[styles.progressCount, { color: colors.primary }]}>
							{completedCount}/{totalCount}
						</Text>
					</View>
					<View
						style={[styles.progressBar, { backgroundColor: colors.border }]}
					>
						<View
							style={[
								styles.progressFill,
								{
									backgroundColor:
										progress === 100 ? colors.success : colors.primary,
									width: `${progress}%`,
								},
							]}
						/>
					</View>
					<Text style={[styles.progressText, { color: colors.textSecondary }]}>
						{progress === 100
							? "Parabéns! Você completou todos os exercícios!"
							: `Faltam ${totalCount - completedCount} exercício${totalCount - completedCount !== 1 ? "s" : ""}`}
					</Text>
				</Card>

				{/* Exercise List */}
				<Text style={[styles.sectionTitle, { color: colors.text }]}>
					Meus Exercícios
				</Text>

				{exercises.map((assignment, index) => (
					<TouchableOpacity
						key={assignment.id}
						onPress={() => toggleExercise(assignment)}
						activeOpacity={0.7}
						disabled={
							completeMutation.isPending &&
							completeMutation.variables?.assignmentId === assignment.id
						}
					>
						<Card
							style={[
								styles.exerciseCard,
								{ borderColor: colors.border },
								assignment.completed && { opacity: 0.7 },
							]}
						>
							<View style={styles.exerciseHeader}>
								<View
									style={[
										styles.checkbox,
										{
											backgroundColor: assignment.completed
												? colors.success
												: "transparent",
											borderColor: assignment.completed
												? colors.success
												: colors.border,
										},
									]}
								>
									{assignment.completed && (
										<Ionicons name="checkmark" size={16} color="#FFFFFF" />
									)}
								</View>
								<View style={styles.exerciseInfo}>
									<View
										style={[
											styles.exerciseNumber,
											{ backgroundColor: colors.surfaceHover },
										]}
									>
										<Text
											style={[
												styles.exerciseNumberText,
												{ color: colors.primary },
											]}
										>
											{index + 1}
										</Text>
									</View>
									<View style={styles.exerciseDetails}>
										<Text
											style={[
												styles.exerciseName,
												{ color: colors.text },
												assignment.completed && styles.completedText,
											]}
											numberOfLines={1}
										>
											{assignment.exercise?.name || "Exercício"}
										</Text>
										<Text
											style={[
												styles.exerciseSets,
												{ color: colors.textSecondary },
											]}
										>
											{assignment.sets} séries × {assignment.reps} reps
											{assignment.holdTime
												? ` • ${assignment.holdTime}s descenso`
												: ""}
											{assignment.restTime
												? ` • ${assignment.restTime}s descanso`
												: ""}
										</Text>
									</View>
								</View>
								{completeMutation.isPending &&
								completeMutation.variables?.assignmentId === assignment.id ? (
									<ActivityIndicator size="small" color={colors.primary} />
								) : (
									<Ionicons
										name={
											assignment.completed
												? "checkmark-circle"
												: "ellipse-outline"
										}
										size={24}
										color={
											assignment.completed ? colors.success : colors.textMuted
										}
									/>
								)}
							</View>
							{assignment.notes && (
								<Text
									style={[
										styles.exerciseDescription,
										{ color: colors.textSecondary },
									]}
									numberOfLines={2}
								>
									{assignment.notes}
								</Text>
							)}
							{assignment.exercise?.videoUrl && (
								<TouchableOpacity
									style={[
										styles.videoIndicator,
										{ backgroundColor: colors.surface },
									]}
									onPress={() => openVideo(assignment)}
									activeOpacity={0.7}
								>
									<Ionicons
										name="play-circle"
										size={16}
										color={colors.primary}
									/>
									<Text
										style={[
											styles.videoIndicatorText,
											{ color: colors.textSecondary },
										]}
									>
										Ver vídeo
									</Text>
									<Ionicons
										name="chevron-forward"
										size={14}
										color={colors.textSecondary}
									/>
								</TouchableOpacity>
							)}
						</Card>
					</TouchableOpacity>
				))}
			</ScrollView>

			{/* Video Modal */}
			<VideoModal
				visible={!!selectedVideo}
				onClose={() => setSelectedVideo(null)}
				videoUri={selectedVideo?.uri || ""}
				title={selectedVideo?.title}
				description={selectedVideo?.description}
				autoPlay={true}
			/>

			{/* Feedback Modal */}
			<ExerciseFeedbackModal
				visible={showFeedbackModal}
				onClose={() => {
					setShowFeedbackModal(false);
					setFeedbackExercise(null);
				}}
				onSubmit={handleFeedbackSubmit}
				exerciseName={feedbackExercise?.exercise?.name || ""}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	pageHeader: {
		paddingHorizontal: Spacing.screen,
		paddingTop: 8,
		paddingBottom: 4,
	},
	pageTitle: {
		fontSize: 28,
		fontWeight: "700",
	},
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
	},
	loadingText: {
		fontSize: 16,
	},
	scrollContent: {
		padding: Spacing.screen,
	},
	planInfoCard: {
		marginBottom: Spacing.gap,
		padding: Spacing.card,
	},
	planName: {
		fontSize: 17,
		fontWeight: "700",
		marginBottom: 4,
	},
	planDescription: {
		fontSize: 13,
		lineHeight: 20,
	},
	progressCard: {
		marginBottom: 20,
		padding: Spacing.card,
	},
	progressHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	progressTitle: {
		fontSize: 15,
		fontWeight: "600",
	},
	progressCount: {
		fontSize: 15,
		fontWeight: "bold",
	},
	progressBar: {
		height: 8,
		borderRadius: 4,
		marginBottom: 8,
	},
	progressFill: {
		height: "100%",
		borderRadius: 4,
	},
	progressText: {
		fontSize: 13,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: "600",
		marginBottom: 10,
	},
	exerciseCard: {
		marginBottom: 10,
		padding: Spacing.card,
		borderWidth: 1,
	},
	exerciseHeader: {
		flexDirection: "row",
		alignItems: "center",
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	exerciseInfo: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
	},
	exerciseNumber: {
		width: 26,
		height: 26,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	exerciseNumberText: {
		fontSize: 13,
		fontWeight: "700",
	},
	exerciseDetails: {
		flex: 1,
	},
	exerciseName: {
		fontSize: 15,
		fontWeight: "600",
		marginBottom: 2,
		lineHeight: 20,
	},
	completedText: {
		textDecorationLine: "line-through",
	},
	exerciseSets: {
		fontSize: 12,
	},
	exerciseDescription: {
		fontSize: 13,
		lineHeight: 18,
		marginLeft: 36,
		marginTop: 6,
	},
	videoIndicator: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 16,
		marginLeft: 36,
		marginTop: 6,
		gap: 6,
	},
	videoIndicatorText: {
		fontSize: 11,
		fontWeight: "500",
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: 60,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginTop: 16,
		marginBottom: 4,
	},
	emptyText: {
		fontSize: 14,
		textAlign: "center",
	},
});
