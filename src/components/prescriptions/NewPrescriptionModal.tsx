import { useState } from "react";
import {
	Dumbbell,
	GripVertical,
	Loader2,
	Plus,
	Trash2,
	BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useExercises } from "@/hooks/useExercises";
import {
	usePrescriptions,
	PrescriptionExercise,
} from "@/hooks/usePrescriptions";
import { useDebounce } from "@/hooks/performance/useDebounce";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useIsMobile } from "@/hooks/use-mobile";

// Helper function to generate UUID - using crypto.randomUUID() to avoid "ne is not a function" error in production
const uuidv4 = (): string => crypto.randomUUID();

interface NewPrescriptionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	patientId: string;
	patientName: string;
	onSuccess?: () => void;
}

export function NewPrescriptionModal({
	open,
	onOpenChange,
	patientId,
	patientName,
	onSuccess,
}: NewPrescriptionModalProps) {
	const isMobile = useIsMobile();
	const [filters, setFilters] = useState({
		searchTerm: "",
		category: "all",
		pathologies: [] as string[],
		bodyParts: [] as string[],
		equipment: [] as string[],
	});

	const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

	const { exercises: availableExercises } = useExercises({
		searchTerm: debouncedSearchTerm,
		category: filters.category === "all" ? undefined : filters.category,
		pathologies:
			filters.pathologies.length > 0 ? filters.pathologies : undefined,
		bodyParts: filters.bodyParts.length > 0 ? filters.bodyParts : undefined,
		equipment: filters.equipment.length > 0 ? filters.equipment : undefined,
	});
	const { createPrescription, isCreating } = usePrescriptions();

	const [title, setTitle] = useState("Prescrição de Reabilitação");
	const [notes, setNotes] = useState("");
	const [validityDays, setValidityDays] = useState("30");
	const [selectedExercises, setSelectedExercises] = useState<
		PrescriptionExercise[]
	>([]);
	const [selectedExerciseId, setSelectedExerciseId] = useState("");

	const handleAddExercise = () => {
		if (!selectedExerciseId) return;

		const exercise = availableExercises.find(
			(e) => e.id === selectedExerciseId,
		);
		if (!exercise) return;

		const newExercise: PrescriptionExercise = {
			id: uuidv4(),
			name: exercise.name,
			description: exercise.description,
			sets: exercise.sets || 3,
			repetitions: exercise.repetitions || 10,
			frequency: "Diariamente",
			video_url: exercise.video_url,
			image_url: exercise.image_url,
		};

		setSelectedExercises([...selectedExercises, newExercise]);
		setSelectedExerciseId("");
	};

	const handleRemoveExercise = (id: string) => {
		setSelectedExercises(selectedExercises.filter((e) => e.id !== id));
	};

	const handleUpdateExercise = (
		id: string,
		field: keyof PrescriptionExercise,
		value: string | number,
	) => {
		setSelectedExercises(
			selectedExercises.map((e) =>
				e.id === id ? { ...e, [field]: value } : e,
			),
		);
	};

	const handleSubmit = async () => {
		if (selectedExercises.length === 0) {
			toast.error("Adicione pelo menos um exercício");
			return;
		}

		try {
			await createPrescription({
				patient_id: patientId,
				title,
				exercises: selectedExercises,
				notes: notes || undefined,
				validity_days: parseInt(validityDays),
			});

			onOpenChange(false);
			onSuccess?.();

			// Reset form
			setTitle("Prescrição de Reabilitação");
			setNotes("");
			setValidityDays("30");
			setSelectedExercises([]);
		} catch (error) {
			logger.error("Erro ao criar prescrição", error, "NewPrescriptionModal");
		}
	};

	return (
		<CustomModal
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			contentClassName="max-w-2xl"
		>
			<CustomModalHeader onClose={() => onOpenChange(false)}>
				<CustomModalTitle className="flex items-center gap-2">
					<Dumbbell className="h-5 w-5 text-primary" />
					Nova Prescrição de Exercícios
				</CustomModalTitle>
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0">
				<div className="px-6 py-4">
					<p className="text-sm text-muted-foreground mb-6">
						Criando prescrição para: <strong>{patientName}</strong>
					</p>

					<div className="space-y-6">
						{/* Basic Info */}
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="title">Título</Label>
								<Input
									id="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Ex: Fortalecimento de Joelho"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="validity">Validade (dias)</Label>
								<Select value={validityDays} onValueChange={setValidityDays}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="7">7 dias</SelectItem>
										<SelectItem value="14">14 dias</SelectItem>
										<SelectItem value="30">30 dias</SelectItem>
										<SelectItem value="60">60 dias</SelectItem>
										<SelectItem value="90">90 dias</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Filters */}
						<div className="space-y-3 p-3 bg-muted/20 rounded-lg border">
							<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Filtros de Busca
							</Label>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="space-y-1">
									<Label className="text-xs">Categoria</Label>
									<Select
										value={filters.category}
										onValueChange={(val) =>
											setFilters((prev) => ({ ...prev, category: val }))
										}
									>
										<SelectTrigger className="h-8">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Todas</SelectItem>
											<SelectItem value="Fortalecimento">
												Fortalecimento
											</SelectItem>
											<SelectItem value="Alongamento">Alongamento</SelectItem>
											<SelectItem value="Mobilidade">Mobilidade</SelectItem>
											<SelectItem value="Cardio">Cardio</SelectItem>
											<SelectItem value="Equilíbrio">Equilíbrio</SelectItem>
											<SelectItem value="Respiratório">Respiratório</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label className="text-xs">Buscar por nome</Label>
									<Input
										placeholder="Nome do exercício..."
										value={filters.searchTerm}
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												searchTerm: e.target.value,
											}))
										}
										className="h-8"
									/>
								</div>
							</div>
						</div>

						{/* Add Exercise */}
						<div className="space-y-2">
							<Label>Adicionar Exercício</Label>
							<div className="flex gap-2">
								<Select
									value={selectedExerciseId}
									onValueChange={setSelectedExerciseId}
								>
									<SelectTrigger className="flex-1">
										<SelectValue placeholder="Selecione um exercício..." />
									</SelectTrigger>
									<SelectContent>
										{availableExercises.map((exercise) => (
											<SelectItem key={exercise.id} value={exercise.id}>
												{exercise.name}
												{exercise.category && (
													<span className="text-muted-foreground ml-2">
														({exercise.category})
													</span>
												)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									onClick={handleAddExercise}
									disabled={!selectedExerciseId}
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Exercise List */}
						{selectedExercises.length > 0 && (
							<div className="space-y-3">
								<Label>
									Exercícios Selecionados ({selectedExercises.length})
								</Label>

								{selectedExercises.map((exercise, index) => (
									<div
										key={exercise.id}
										className="border rounded-lg p-4 space-y-3 bg-muted/30"
									>
										<div className="flex items-start justify-between gap-2">
											<div className="flex items-center gap-2">
												<GripVertical className="h-4 w-4 text-muted-foreground" />
												<Badge variant="outline">{index + 1}</Badge>
												<span className="font-medium">{exercise.name}</span>
											</div>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-destructive"
												onClick={() => handleRemoveExercise(exercise.id)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>

										<div className="grid gap-3 md:grid-cols-3">
											<div className="space-y-1">
												<Label className="text-xs">Séries</Label>
												<Input
													type="number"
													min={1}
													value={exercise.sets}
													onChange={(e) =>
														handleUpdateExercise(
															exercise.id,
															"sets",
															parseInt(e.target.value) || 1,
														)
													}
												/>
											</div>
											<div className="space-y-1">
												<Label className="text-xs">Repetições</Label>
												<Input
													type="number"
													min={1}
													value={exercise.repetitions}
													onChange={(e) =>
														handleUpdateExercise(
															exercise.id,
															"repetitions",
															parseInt(e.target.value) || 1,
														)
													}
												/>
											</div>
											<div className="space-y-1">
												<Label className="text-xs">Frequência</Label>
												<Select
													value={exercise.frequency}
													onValueChange={(value) =>
														handleUpdateExercise(
															exercise.id,
															"frequency",
															value,
														)
													}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="Diariamente">
															Diariamente
														</SelectItem>
														<SelectItem value="2x ao dia">2x ao dia</SelectItem>
														<SelectItem value="3x por semana">
															3x por semana
														</SelectItem>
														<SelectItem value="Dias alternados">
															Dias alternados
														</SelectItem>
														<SelectItem value="Semanalmente">
															Semanalmente
														</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>

										<div className="space-y-1">
											<Label className="text-xs">Observações</Label>
											<Input
												placeholder="Ex: Manter coluna reta, respirar pausadamente..."
												value={exercise.observations || ""}
												onChange={(e) =>
													handleUpdateExercise(
														exercise.id,
														"observations",
														e.target.value,
													)
												}
											/>
										</div>
									</div>
								))}
							</div>
						)}

						{/* Notes */}
						<div className="space-y-2">
							<Label htmlFor="notes">Observações Gerais</Label>
							<Textarea
								id="notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Orientações gerais para o paciente..."
								rows={3}
							/>
						</div>
					</div>
				</div>
			</CustomModalBody>

			<CustomModalFooter isMobile={isMobile}>
				<Button
					type="button"
					variant="ghost"
					className="rounded-xl h-11 px-6 font-bold text-slate-500 hover:bg-slate-100"
					onClick={() => onOpenChange(false)}
					disabled={isCreating}
				>
					Cancelar
				</Button>
				<Button
					type="button"
					onClick={handleSubmit}
					className="rounded-xl h-11 px-8 gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
					disabled={isCreating || selectedExercises.length === 0}
				>
					{isCreating ? (
						<div className="flex items-center gap-2">
							<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
							Salvando...
						</div>
					) : (
						<>
							<BadgeCheck className="w-4 h-4" />
							Criar Prescrição
						</>
					)}
				</Button>
			</CustomModalFooter>
		</CustomModal>
	);
}
