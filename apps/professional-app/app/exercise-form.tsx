import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
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
import {
	findExactNormalizedMatch,
	findSimilarItems,
} from "@/lib/utils/similarity";
import type { Exercise } from "@/types";
import { SafeAreaView } from "react-native-safe-area-context";

const DIFFICULTIES = [
	{ label: "Iniciante", value: "easy" },
	{ label: "Médio", value: "medium" },
	{ label: "Difícil", value: "hard" },
];

function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

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

function AutocompleteMultiSelectModal({
	visible,
	onClose,
	title,
	fieldLabel,
	options,
	selectedValues,
	onSelect,
	allExistingLabels,
}: {
	visible: boolean;
	onClose: () => void;
	title: string;
	fieldLabel: string;
	options: { label: string; value: string }[];
	selectedValues: string[];
	onSelect: (values: string[]) => void;
	allExistingLabels?: string[];
}) {
	const [searchQuery, setSearchQuery] = useState("");
	const { medium, success } = useHaptics();

	const filteredOptions = useMemo(() => {
		if (!searchQuery.trim()) return options;
		const normalized = normalizeText(searchQuery);
		return options.filter((opt) =>
			normalizeText(opt.label).includes(normalized),
		);
	}, [searchQuery, options]);

	const noResults =
		searchQuery.trim().length > 0 && filteredOptions.length === 0;

	const handleToggle = useCallback(
		(value: string) => {
			medium();
			const isSelected = selectedValues.includes(value);
			onSelect(
				isSelected
					? selectedValues.filter((v) => v !== value)
					: [...selectedValues, value],
			);
		},
		[selectedValues, onSelect, medium],
	);

	const handleConfirmNew = useCallback(() => {
		const trimmed = searchQuery.trim();
		if (!trimmed) return;

		const exactMatch = findExactNormalizedMatch(trimmed, options);
		if (exactMatch) {
			if (!selectedValues.includes(exactMatch.label)) {
				onSelect([...selectedValues, exactMatch.label]);
			}
			setSearchQuery("");
			success();
			return;
		}

		const allLabels = allExistingLabels || options.map((o) => o.label);
		const alreadySelected = selectedValues.find(
			(s) => normalizeText(s) === normalizeText(trimmed),
		);
		if (alreadySelected) {
			Alert.alert("Atenção", `"${trimmed}" já está selecionado.`);
			setSearchQuery("");
			return;
		}

		const exactInAll = allLabels.find(
			(l) => normalizeText(l) === normalizeText(trimmed),
		);
		if (exactInAll && exactInAll !== trimmed) {
			Alert.alert(
				"Autocorreção",
				`Corrigido para "${exactInAll}". Deseja adicionar?`,
				[
					{ text: "Cancelar", style: "cancel" },
					{
						text: "Sim",
						onPress: () => {
							if (!selectedValues.includes(exactInAll)) {
								onSelect([...selectedValues, exactInAll]);
							}
							setSearchQuery("");
							success();
						},
					},
				],
			);
			return;
		}

		const similarItems = findSimilarItems(trimmed, options, 0.7);
		if (similarItems.length > 0) {
			const bestMatch = similarItems[0];
			Alert.alert(
				"Item Similar Encontrado",
				`Encontramos "${bestMatch.label}" que é parecido com "${trimmed}".\n\nDeseja usar o item existente ou criar um novo?`,
				[
					{ text: "Cancelar", style: "cancel" },
					{
						text: `Criar "${trimmed}"`,
						onPress: () => {
							if (!selectedValues.includes(trimmed)) {
								onSelect([...selectedValues, trimmed]);
							}
							setSearchQuery("");
							success();
						},
					},
					{
						text: `Usar "${bestMatch.label}"`,
						onPress: () => {
							if (!selectedValues.includes(bestMatch.label)) {
								onSelect([...selectedValues, bestMatch.label]);
							}
							setSearchQuery("");
							success();
						},
					},
				],
			);
			return;
		}

		Alert.alert(
			"Confirmar Cadastro",
			`Deseja adicionar "${trimmed}" como novo${fieldLabel ? " " + fieldLabel : ""}?`,
			[
				{ text: "Não", style: "cancel" },
				{
					text: "Sim",
					onPress: () => {
						if (!selectedValues.includes(trimmed)) {
							onSelect([...selectedValues, trimmed]);
						}
						setSearchQuery("");
						success();
					},
				},
			],
		);
	}, [
		searchQuery,
		options,
		selectedValues,
		onSelect,
		allExistingLabels,
		fieldLabel,
		success,
		medium,
	]);

	const handleSubmitEditing = useCallback(() => {
		const trimmed = searchQuery.trim();
		if (!trimmed) return;

		const exactMatch = options.find(
			(o) => normalizeText(o.label) === normalizeText(trimmed),
		);
		if (exactMatch) {
			if (!selectedValues.includes(exactMatch.label)) {
				onSelect([...selectedValues, exactMatch.label]);
			}
			setSearchQuery("");
			medium();
			return;
		}

		if (noResults) {
			handleConfirmNew();
		}
	}, [
		searchQuery,
		options,
		selectedValues,
		onSelect,
		noResults,
		handleConfirmNew,
		medium,
	]);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<SafeAreaView style={msStyles.overlay}>
				<View style={msStyles.content}>
					<View style={msStyles.header}>
						<Text style={msStyles.title}>{title}</Text>
						<TouchableOpacity onPress={onClose}>
							<Ionicons name="close" size={24} color="#fff" />
						</TouchableOpacity>
					</View>

					<View style={msStyles.searchContainer}>
						<Ionicons
							name="search"
							size={18}
							color="#94a3b8"
							style={{ marginLeft: 8 }}
						/>
						<TextInput
							style={msStyles.searchInput}
							placeholder="Buscar ou criar novo..."
							placeholderTextColor="#64748b"
							value={searchQuery}
							onChangeText={setSearchQuery}
							onSubmitEditing={handleSubmitEditing}
							returnKeyType="done"
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity
								onPress={() => setSearchQuery("")}
								style={{ marginRight: 8 }}
							>
								<Ionicons name="close-circle" size={18} color="#64748b" />
							</TouchableOpacity>
						)}
					</View>

					{noResults && (
						<TouchableOpacity
							style={msStyles.noResultCard}
							onPress={handleConfirmNew}
							activeOpacity={0.7}
						>
							<Ionicons name="add-circle-outline" size={22} color="#60a5fa" />
							<Text style={msStyles.noResultText}>
								Criar "{searchQuery.trim()}"
							</Text>
							<Text style={msStyles.noResultSub}>Toque para adicionar</Text>
						</TouchableOpacity>
					)}

					<ScrollView
						style={msStyles.scroll}
						keyboardShouldPersistTaps="handled"
					>
						{filteredOptions.map((option) => {
							const isSelected = selectedValues.includes(option.label);
							return (
								<TouchableOpacity
									key={option.value}
									style={[msStyles.item, isSelected && msStyles.itemSelected]}
									onPress={() => handleToggle(option.label)}
									activeOpacity={0.6}
								>
									<Text
										style={[
											msStyles.itemText,
											isSelected && msStyles.itemTextSelected,
										]}
									>
										{option.label}
									</Text>
									{isSelected ? (
										<Ionicons
											name="checkmark-circle"
											size={22}
											color="#4ade80"
										/>
									) : (
										<Ionicons
											name="ellipse-outline"
											size={22}
											color="#475569"
										/>
									)}
								</TouchableOpacity>
							);
						})}
					</ScrollView>

					<TouchableOpacity style={msStyles.confirmBtn} onPress={onClose}>
						<Text style={msStyles.confirmBtnText}>
							Confirmar ({selectedValues.length} selecionado
							{selectedValues.length !== 1 ? "s" : ""})
						</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		</Modal>
	);
}

const msStyles = StyleSheet.create({
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
		maxHeight: "85%",
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
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginHorizontal: 12,
		marginVertical: 10,
		backgroundColor: "#0f172a",
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "#334155",
	},
	searchInput: {
		flex: 1,
		paddingHorizontal: 10,
		paddingVertical: 12,
		color: "#e2e8f0",
		fontSize: 15,
	},
	noResultCard: {
		marginHorizontal: 12,
		marginBottom: 8,
		padding: 14,
		backgroundColor: "#172554",
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "#1e3a5f",
		gap: 2,
	},
	noResultText: {
		color: "#60a5fa",
		fontSize: 15,
		fontWeight: "600",
		marginTop: 2,
	},
	noResultSub: {
		color: "#64748b",
		fontSize: 12,
	},
	scroll: {
		flex: 1,
	},
	item: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 13,
		borderBottomWidth: 1,
		borderBottomColor: "#1e293b",
	},
	itemSelected: {
		backgroundColor: "#1e3a5f",
	},
	itemText: {
		fontSize: 15,
		color: "#cbd5e1",
		flex: 1,
	},
	itemTextSelected: {
		color: "#fff",
		fontWeight: "600",
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
	const [showTagsModal, setShowTagsModal] = useState(false);

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

	const handleTagSelect = (newTags: string[]) => {
		setTags(newTags);
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
	const tagOptions = tags.map((t) => ({
		label: t,
		value: t,
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
								flex: 1,
							}}
							numberOfLines={1}
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
								flex: 1,
							}}
							numberOfLines={1}
						>
							{bodyParts.length > 0
								? bodyParts.join(", ")
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
								flex: 1,
							}}
							numberOfLines={1}
						>
							{equipment.length > 0
								? equipment.join(", ")
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
					<TouchableOpacity
						style={[
							styles.multiSelectBtn,
							{ borderColor: colors.border, backgroundColor: colors.surface },
						]}
						onPress={() => setShowTagsModal(true)}
					>
						<Text
							style={{
								color: tags.length ? colors.text : colors.textMuted,
								flex: 1,
							}}
							numberOfLines={1}
						>
							{tags.length > 0 ? tags.join(", ") : "Selecione ou crie tags..."}
						</Text>
						<Ionicons
							name="chevron-down"
							size={20}
							color={colors.textSecondary}
						/>
					</TouchableOpacity>
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
									onPress={() => setTags(tags.filter((t) => t !== tag))}
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

			<AutocompleteMultiSelectModal
				visible={showCategoriesModal}
				onClose={() => setShowCategoriesModal(false)}
				title="Categorias"
				fieldLabel="a categoria"
				options={categoryOptions}
				selectedValues={categories}
				onSelect={setCategories}
			/>

			<AutocompleteMultiSelectModal
				visible={showBodyPartsModal}
				onClose={() => setShowBodyPartsModal(false)}
				title="Partes do Corpo"
				fieldLabel="a parte do corpo"
				options={bodyPartsOptions}
				selectedValues={bodyParts}
				onSelect={setBodyParts}
			/>

			<AutocompleteMultiSelectModal
				visible={showEquipmentModal}
				onClose={() => setShowEquipmentModal(false)}
				title="Equipamentos"
				fieldLabel="o equipamento"
				options={equipmentOptions}
				selectedValues={equipment}
				onSelect={setEquipment}
			/>

			<AutocompleteMultiSelectModal
				visible={showTagsModal}
				onClose={() => setShowTagsModal(false)}
				title="Tags"
				fieldLabel="a tag"
				options={tagOptions}
				selectedValues={tags}
				onSelect={handleTagSelect}
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
});
