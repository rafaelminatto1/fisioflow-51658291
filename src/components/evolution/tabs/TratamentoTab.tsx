/**
 * TratamentoTab - Tab component for treatment (exercises, goals, pathologies, cycles)
 *
 * Extracted from PatientEvolution for better code splitting and performance
 * Requirements: 4.1, 4.4 - Component-level code splitting
 *
 * @version 3.0.0 - TreatmentCycles connected to Neon via useTreatmentCycles
 */

import { lazy, Suspense, useState } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { GoalsTracker } from "@/components/evolution/GoalsTracker";
import { PathologyStatus } from "@/components/evolution/PathologyStatus";
import { TreatmentCycles } from "@/components/evolution/TreatmentCycles";
import { TreatmentCycleFormModal } from "@/components/evolution/TreatmentCycleFormModal";
import { useTreatmentCycles } from "@/hooks/evolution/useTreatmentCycles";
import { useToast } from "@/hooks/use-toast";
import type { SessionExercise } from "@/components/evolution/SessionExercisesPanel";
import type { Goal, Pathology } from "@/types";
import type { TreatmentCycle } from "@/components/evolution/TreatmentCycles";
import type { CreateCycleInput } from "@/hooks/evolution/useTreatmentCycles";

// Lazy load heavy components
const LazySessionExercisesPanel = lazy(() =>
	import("@/components/evolution/SessionExercisesPanel").then((m) => ({
		default: m.SessionExercisesPanel,
	})),
);

interface TratamentoTabProps {
	sessionExercises: SessionExercise[];
	onExercisesChange: (exercises: SessionExercise[]) => void;
	goals: Goal[];
	pathologies: Pathology[];
	patientId?: string;
	currentSessionCount?: number;
}

export function TratamentoTab({
	sessionExercises,
	onExercisesChange,
	goals,
	pathologies,
	patientId = "",
	currentSessionCount,
}: TratamentoTabProps) {
	const [modalOpen, setModalOpen] = useState(false);
	const [editingCycle, setEditingCycle] = useState<TreatmentCycle | null>(null);

	const {
		cycles,
		isLoading,
		createCycle,
		isCreating,
		updateCycle,
		isUpdating,
	} = useTreatmentCycles(patientId);
	const { toast } = useToast();

	const handleOpenCreate = () => {
		setEditingCycle(null);
		setModalOpen(true);
	};

	const handleOpenEdit = (cycle: TreatmentCycle) => {
		setEditingCycle(cycle);
		setModalOpen(true);
	};

	const handleSubmit = async (data: CreateCycleInput) => {
		try {
			if (editingCycle) {
				await updateCycle({ id: editingCycle.id, data });
				toast({ title: "Ciclo atualizado com sucesso" });
			} else {
				await createCycle({ ...data, patient_id: patientId });
				toast({ title: "Ciclo criado com sucesso" });
			}
		} catch {
			toast({
				title: "Erro ao salvar ciclo",
				description: "Tente novamente.",
				variant: "destructive",
			});
			throw new Error("save failed"); // re-throw so modal stays open
		}
	};

	return (
		<div className="mt-4 space-y-4">
			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazySessionExercisesPanel
					exercises={sessionExercises}
					onChange={onExercisesChange}
				/>
			</Suspense>

			<GoalsTracker goals={goals} />
			<PathologyStatus pathologies={pathologies} />

			{/* Treatment Cycles - Linear-inspired sprint/cycle tracking */}
			{!isLoading && (
				<TreatmentCycles
					patientId={patientId}
					cycles={cycles}
					currentSessionCount={currentSessionCount}
					onCreateCycle={handleOpenCreate}
					onEditCycle={handleOpenEdit}
				/>
			)}
			{isLoading && <LoadingSkeleton type="card" />}

			{/* Create / Edit Modal */}
			<TreatmentCycleFormModal
				open={modalOpen}
				onOpenChange={(open) => {
					setModalOpen(open);
					if (!open) setEditingCycle(null);
				}}
				cycle={editingCycle}
				onSubmit={handleSubmit}
				isSaving={isCreating || isUpdating}
			/>
		</div>
	);
}
