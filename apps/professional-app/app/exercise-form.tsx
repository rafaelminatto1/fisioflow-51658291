import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { Button } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import {
	useExerciseCreate,
	useExerciseDelete,
	useExerciseUpdate,
} from "@/hooks/useExercises";
import { useHaptics } from "@/hooks/useHaptics";
import { getExerciseById } from "@/lib/api";
import {
	BODY_PARTS,
	CATEGORIES,
	EQUIPMENT,
} from "@/lib/constants/exerciseConstants";
import type { Exercise } from "@/types";

const DIFFICULTIES = [
	{ label: "Iniciante", value: "easy" },
	{ label: "Médio", value: "medium" },
	{ label: "Difícil", value: "hard" },
];

function SegmentedPicker({
	options,
	value,
	onChange,
	primaryColor,
	textMuted,
}: {
	options: { label: string; value: string }[];
	value: string;
	onChange: (v: string) => void;
	primaryColor: string;
	textMuted: string;
}) {
	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false}>
			<View style={pickerStyles.row}>
				{options.map((opt) => {
					const active = value === opt.value;
					return (
						<TouchableOpacity
							key={opt.value}
							style={[
								pickerStyles.pill,
								active && { backgroundColor: primaryColor },
							]}
							onPress={() => onChange(opt.value)}
						>
							<Text
								style={[
									pickerStyles.text,
									{ color: active ? "#fff" : textMuted },
								]}
							>
								{opt.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</ScrollView>
	);
}

const pickerStyles = StyleSheet.create({
	row: { flexDirection: "row", gap: 6 },
	pill: {
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor: "#f1f5f9",
	},
	text: { fontSize: 13, fontWeight: "500" },
});

function MultiSelectModal({
	visible,
	onClose,
	title,
	options,
	selectedValues,
	onSelect,
	onCreateNew,
	allowCreateNew,
}: {
	visible: boolean;
	onClose: () => void;
	title: string;
	options: { label: string; value: string }[];
	selectedValues: string[];
	onSelect: (values: string[]) => void;
	onCreateNew?: (value: string) => void;
	allowCreateNew?: boolean;
}) {
	const [newOption, setNewOption] = useState("");

	const handleToggle = (value: string) => {
		const isSelected = selectedValues.includes(value);
		onSelect(
			isSelected
				? selectedValues.filter((v) => v !== value)
				: [...selectedValues, value],
		);
	};

	const handleCreateNew = () => {
		if (newOption.trim() && onCreateNew) {
			onCreateNew(newOption.trim());
			setNewOption("");
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<SafeAreaView style={modalStyles.overlay}>
				<View style={modalStyles.content}>
					<View style={modalStyles.header}>
						<Text style={modalStyles.title}>{title}</Text>
						<TouchableOpacity onPress={onClose}>
							<Ionicons name="close" size={24} color="#fff" />
						</TouchableOpacity>
					</View>

					{allowCreateNew && (
						<View style={modalStyles.newOptionContainer}>
							<TextInput
								style={modalStyles.newOptionInput}
								placeholder="Nova opção..."
								placeholderTextColor="#999"
								value={newOption}
								onChangeText={setNewOption}
							/>
							<TouchableOpacity
								style={modalStyles.newOptionBtn}
								onPress={handleCreateNew}
							>
								<Ionicons name="add" size={20} color="#fff" />
							</TouchableOpacity>
						</View>
					)}

					<ScrollView style={modalStyles.scroll}>
						{options.map((option) => (
							<TouchableOpacity
								key={option.value}
								style={[
									modalStyles.item,
									selectedValues.includes(option.value) &&
										modalStyles.itemSelected,
								]}
								onPress={() => handleToggle(option.value)}
							>
								<Text
									style={[
										modalStyles.itemText,
										selectedValues.includes(option.value) &&
											modalStyles.itemTextSelected,
									]}
								>
									{option.label}
								</Text>
								{selectedValues.includes(option.value) && (
									<Ionicons name="checkmark" size={20} color="#4ade80" />
								)}
							</TouchableOpacity>
						))}
					</ScrollView>

					<TouchableOpacity style={modalStyles.confirmBtn} onPress={onClose}>
						<Text style={modalStyles.confirmBtnText}>Confirmar</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		</Modal>
	);
}

const modalStyles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	content: {
		backgroundColor: "#1e293b",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 20,
		maxHeight: "80%",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#334155",
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
		color: "#fff",
	},
	newOptionContainer: {
		flexDirection: "row",
		padding: 12,
		gap: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#334155",
	},
	newOptionInput: {
		flex: 1,
		backgroundColor: "#334155",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		color: "#fff",
	},
	newOptionBtn: {
		backgroundColor: "#3b82f6",
		borderRadius: 8,
		paddingHorizontal: 16,
		justifyContent: "center",
	},
	scroll: {
		flex: 1,
	},
	item: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: "#334155",
	},
	itemSelected: {
		backgroundColor: "#1e3a5f",
	},
	itemText: {
		fontSize: 16,
		color: "#e2e8f0",
	},
	itemTextSelected: {
		color: "#fff",
	},
	confirmBtn: {
		backgroundColor: "#3b82f6",
		margin: 16,
		borderRadius: 10,
		paddingVertical: 14,
		alignItems: "center",
	},
	confirmBtnText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
});

export default function ExerciseFormScreen() {
	const colors = useColors();
	const router = useRouter();
	const params = useLocalSearchParams();
	const { medium, success, error } = useHaptics();

	const exerciseId = params.id as string | undefined;
	const isEditing = !!exerciseId;

	const { createExerciseAsync, isCreating } = useExerciseCreate();
	const { updateExerciseAsync, isUpdating } = useExerciseUpdate();
	const { deleteExerciseAsync, isDeleting } = useExerciseDelete();

	const [categories, setCategories] = useState<string[]>(["Fortalecimento"]);
	const [tags, setTags] = useState<string[]>([]);
	const [bodyParts, setBodyParts] = useState<string[]>([]);
	const [equipment, setEquipment] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState("");

	const [showCategoriesModal, setShowCategoriesModal] = useState(false);
	const [showBodyPartsModal, setShowBodyPartsModal] = useState(false);
	const [showEquipmentModal, setShowEquipmentModal] = useState(false);

	const [formData, setFormData] = useState<Partial<Exercise>>({
		name: "",
		description: "",
		category: "",
		difficulty: "medium",
		instructions: [],
		videoUrl: "",
		imageUrl: "",
	});

	const { data: exercise, isLoading: isLoadingExercise } = useQuery({
		queryKey: ["exercise", exerciseId],
		queryFn: async () => {
			if (!exerciseId) return null;
			const result = await getExerciseById(exerciseId);
			return result;
		},
		enabled: !!exerciseId,
	});

	useEffect(() => {
		if (exercise) {
			setFormData({
				name: exercise.name || "",
				description: exercise.description || "",
				category: exercise.category || "",
				difficulty: (exercise.difficulty as any) || "medium",
				instructions: exercise.instructions || [],
				videoUrl: exercise.videoUrl || "",
				imageUrl: exercise.imageUrl || "",
			});
			setCategories(exercise.category ? [exercise.category] : []);
		}
	}, [exercise]);

	const handleSave = async () => {
		medium();
		if (!formData.name) {
			Alert.alert("Erro", "O nome do exercício é obrigatório.");
			error();
			return;
		}

		try {
			const dataToSave = {
				...formData,
				category: categories[0] || "",
			};
			if (isEditing && exerciseId) {
				await updateExerciseAsync({ id: exerciseId, data: dataToSave });
				success();
				Alert.alert("Sucesso", "Exercício atualizado com sucesso!");
			} else {
				await createExerciseAsync(
					dataToSave as Omit<Exercise, "id" | "createdAt" | "updatedAt">,
				);
				success();
				Alert.alert("Sucesso", "Exercício criado com sucesso!");
			}
			router.back();
		} catch (err: any) {
			error();
			Alert.alert(
				"Erro",
				err.message || "Não foi possível salvar o exercício.",
			);
		}
	};

	const handleDelete = () => {
		if (!exerciseId) return;
		medium();
		Alert.alert(
			"Excluir Exercício",
			"Tem certeza que deseja excluir este exercício da biblioteca? Esta ação não pode ser desfeita.",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir",
					style: "destructive",
					onPress: async () => {
						try {
							await deleteExerciseAsync(exerciseId);
							success();
							Alert.alert("Sucesso", "Exercício excluído com sucesso.");
							router.replace("/exercises");
						} catch (err: any) {
							error();
							Alert.alert(
								"Erro",
								err.message || "Não foi possível excluir o exercício.",
							);
						}
					},
				},
			],
		);
	};

	const updateField = (field: keyof typeof formData, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const addTag = () => {
		const trimmed = tagInput.trim();
		if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
			setTags([...tags, trimmed]);
		}
		setTagInput("");
	};

	const removeTag = (tag: string) => {
		setTags(tags.filter((t) => t !== tag));
	};

	if (isLoadingExercise) {
		return (
			<ActivityIndicator
				style={{ flex: 1 }}
				color={colors.primary}
				size="large"
			/>
		);
	}

	const categoryOptions = CATEGORIES.map((c) => ({
		label: c.label,
		value: c.value,
	}));
	const bodyPartsOptions = BODY_PARTS.map((b) => ({
		label: b.label,
		value: b.label,
	}));
	const equipmentOptions = EQUIPMENT.map((e) => ({
		label: e.label,
		value: e.label,
	}));

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["left", "right"]}
		>
			<Stack.Screen options={{ headerShown: false }} />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color={colors.text} />
					</TouchableOpacity>
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						{isEditing ? "Editar Exercício" : "Novo Exercício"}
					</Text>
					{isEditing ? (
						<TouchableOpacity onPress={handleDelete} disabled={isDeleting}>
							<Ionicons name="trash-outline" size={24} color={colors.error} />
						</TouchableOpacity>
					) : (
						<View style={{ width: 24 }} />
					)}
				</View>

				<ScrollView style={styles.form}>
					<Text style={[styles.label, { color: colors.text }]}>
						Nome do Exercício *
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								backgroundColor: colors.surface,
								color: colors.text,
							},
						]}
						value={formData.name}
						onChangeText={(v) => updateField("name", v)}
						placeholder="Ex: Agachamento com Peso"
						placeholderTextColor={colors.textMuted}
					/>

					<Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
					<TextInput
						style={[
							styles.input,
							styles.textArea,
							{
								borderColor: colors.border,
								backgroundColor: colors.surface,
								color: colors.text,
							},
						]}
						value={formData.description}
						onChangeText={(v) => updateField("description", v)}
						placeholder="Breve descrição do objetivo do exercício"
						placeholderTextColor={colors.textMuted}
						multiline
						numberOfLines={4}
						textAlignVertical="top"
					/>

					<Text style={[styles.label, { color: colors.text }]}>
						Dificuldade
					</Text>
					<SegmentedPicker
						options={DIFFICULTIES}
						value={formData.difficulty || "medium"}
						onChange={(v) => updateField("difficulty", v)}
						primaryColor={colors.primary}
						textMuted={colors.textMuted}
					/>

					<Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
					<TouchableOpacity
						style={[
							styles.multiSelectBtn,
							{ borderColor: colors.border, backgroundColor: colors.surface },
						]}
						onPress={() => setShowCategoriesModal(true)}
					>
						<Text
							style={{
								color: categories.length ? colors.text : colors.textMuted,
							}}
						>
							{categories.length > 0
								? categories.join(", ")
								: "Selecione categorias..."}
						</Text>
						<Ionicons
							name="chevron-down"
							size={20}
							color={colors.textSecondary}
						/>
					</TouchableOpacity>
					{categories.length > 0 && (
						<View style={styles.chipsContainer}>
							{categories.map((cat) => (
								<TouchableOpacity
									key={cat}
									style={[
										styles.chip,
										{
											backgroundColor: colors.surface,
											borderColor: colors.border,
										},
									]}
									onPress={() =>
										setCategories(categories.filter((c) => c !== cat))
									}
								>
									<Text style={[styles.chipText, { color: colors.textMuted }]}>
										{cat}
									</Text>
									<Ionicons name="close" size={11} color={colors.textMuted} />
								</TouchableOpacity>
							))}
						</View>
					)}

					<Text style={[styles.label, { color: colors.text }]}>
						Partes do Corpo
					</Text>
					<TouchableOpacity
						style={[
							styles.multiSelectBtn,
							{ borderColor: colors.border, backgroundColor: colors.surface },
						]}
						onPress={() => setShowBodyPartsModal(true)}
					>
						<Text
							style={{
								color: bodyParts.length ? colors.text : colors.textMuted,
							}}
						>
							{bodyParts.length > 0
								? `${bodyParts.length} selecionadas`
								: "Selecione partes do corpo..."}
						</Text>
						<Ionicons
							name="chevron-down"
							size={20}
							color={colors.textSecondary}
						/>
					</TouchableOpacity>
					{bodyParts.length > 0 && (
						<View style={styles.chipsContainer}>
							{bodyParts.map((part) => (
								<TouchableOpacity
									key={part}
									style={[
										styles.chip,
										{
											backgroundColor: colors.surface,
											borderColor: colors.border,
										},
									]}
									onPress={() =>
										setBodyParts(bodyParts.filter((p) => p !== part))
									}
								>
									<Text style={[styles.chipText, { color: colors.textMuted }]}>
										{part}
									</Text>
									<Ionicons name="close" size={11} color={colors.textMuted} />
								</TouchableOpacity>
							))}
						</View>
					)}

					<Text style={[styles.label, { color: colors.text }]}>
						Equipamentos
					</Text>
					<TouchableOpacity
						style={[
							styles.multiSelectBtn,
							{ borderColor: colors.border, backgroundColor: colors.surface },
						]}
						onPress={() => setShowEquipmentModal(true)}
					>
						<Text
							style={{
								color: equipment.length ? colors.text : colors.textMuted,
							}}
						>
							{equipment.length > 0
								? `${equipment.length} selecionados`
								: "Selecione equipamentos..."}
						</Text>
						<Ionicons
							name="chevron-down"
							size={20}
							color={colors.textSecondary}
						/>
					</TouchableOpacity>
					{equipment.length > 0 && (
						<View style={styles.chipsContainer}>
							{equipment.map((eq) => (
								<TouchableOpacity
									key={eq}
									style={[
										styles.chip,
										{
											backgroundColor: colors.surface,
											borderColor: colors.border,
										},
									]}
									onPress={() =>
										setEquipment(equipment.filter((e) => e !== eq))
									}
								>
									<Text style={[styles.chipText, { color: colors.textMuted }]}>
										{eq}
									</Text>
									<Ionicons name="close" size={11} color={colors.textMuted} />
								</TouchableOpacity>
							))}
						</View>
					)}

					<Text style={[styles.label, { color: colors.text }]}>Tags</Text>
					<View
						style={[
							styles.tagInputRow,
							{ borderColor: colors.border, backgroundColor: colors.surface },
						]}
					>
						<TextInput
							style={[styles.tagInput, { color: colors.text }]}
							value={tagInput}
							onChangeText={setTagInput}
							placeholder="Adicionar tag (Enter)..."
							placeholderTextColor={colors.textMuted}
							onSubmitEditing={addTag}
							returnKeyType="done"
							blurOnSubmit={false}
							maxLength={30}
						/>
						{tagInput.trim().length > 0 && (
							<TouchableOpacity
								style={[styles.tagAddBtn, { backgroundColor: colors.primary }]}
								onPress={addTag}
							>
								<Text style={styles.tagAddBtnText}>+</Text>
							</TouchableOpacity>
						)}
					</View>
					{tags.length > 0 && (
						<View style={styles.chipsContainer}>
							{tags.map((tag) => (
								<TouchableOpacity
									key={tag}
									style={[
										styles.chip,
										{
											backgroundColor: colors.surface,
											borderColor: colors.border,
										},
									]}
									onPress={() => removeTag(tag)}
								>
									<Text style={[styles.chipText, { color: colors.textMuted }]}>
										{tag}
									</Text>
									<Ionicons name="close" size={11} color={colors.textMuted} />
								</TouchableOpacity>
							))}
						</View>
					)}

					<Text style={[styles.label, { color: colors.text }]}>
						URL da Imagem
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								backgroundColor: colors.surface,
								color: colors.text,
							},
						]}
						value={formData.imageUrl}
						onChangeText={(v) => updateField("imageUrl", v)}
						placeholder="https://exemplo.com/imagem.png"
						placeholderTextColor={colors.textMuted}
						keyboardType="url"
					/>

					<Text style={[styles.label, { color: colors.text }]}>
						URL do Vídeo
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								backgroundColor: colors.surface,
								color: colors.text,
							},
						]}
						value={formData.videoUrl}
						onChangeText={(v) => updateField("videoUrl", v)}
						placeholder="https://youtube.com/watch?v=..."
						placeholderTextColor={colors.textMuted}
						keyboardType="url"
					/>

					<Button
						title={isEditing ? "Salvar Alterações" : "Criar Exercício"}
						onPress={handleSave}
						loading={isCreating || isUpdating}
						style={{ marginTop: 24 }}
					/>
					<View style={{ height: 100 }} />
				</ScrollView>
			</KeyboardAvoidingView>

			<MultiSelectModal
				visible={showCategoriesModal}
				onClose={() => setShowCategoriesModal(false)}
				title="Selecione as Categorias"
				options={categoryOptions}
				selectedValues={categories}
				onSelect={setCategories}
				allowCreateNew
				onCreateNew={(newCat) => {
					if (!categories.includes(newCat)) {
						setCategories([...categories, newCat]);
					}
				}}
			/>

			<MultiSelectModal
				visible={showBodyPartsModal}
				onClose={() => setShowBodyPartsModal(false)}
				title="Selecione as Partes do Corpo"
				options={bodyPartsOptions}
				selectedValues={bodyParts}
				onSelect={setBodyParts}
			/>

			<MultiSelectModal
				visible={showEquipmentModal}
				onClose={() => setShowEquipmentModal(false)}
				title="Selecione os Equipamentos"
				options={equipmentOptions}
				selectedValues={equipment}
				onSelect={setEquipment}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
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
	},
	form: {
		flex: 1,
		padding: 16,
		gap: 4,
	},
	label: {
		fontSize: 13,
		fontWeight: "600",
		marginTop: 16,
		marginBottom: 6,
		letterSpacing: 0.1,
	},
	input: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 16,
	},
	textArea: {
		minHeight: 100,
		paddingTop: 12,
	},
	multiSelectBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderRadius: 12,
		borderWidth: 1,
	},
	chipsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		marginTop: 8,
	},
	chip: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 4,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		borderWidth: 1,
	},
	chipText: {
		fontSize: 12,
	},
	tagInputRow: {
		flexDirection: "row",
		borderWidth: 1,
		borderRadius: 12,
		overflow: "hidden",
	},
	tagInput: {
		flex: 1,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
	},
	tagAddBtn: {
		paddingHorizontal: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	tagAddBtnText: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "700",
	},
});
