import { Suspense, useMemo, useState } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useSoapRecordsV2 } from "@/hooks/useSoapRecordsV2";
import { useCreateSoapRecord } from "@/hooks/useSoapRecords";
import { lazy } from "react";
import { toast } from "sonner";

const LazySessionHistoryPanel = lazy(() =>
	import("@/components/session/SessionHistoryPanel").then((m) => ({
		default: m.SessionHistoryPanel,
	})),
);

interface PatientClinicalHistoryTabProps {
	patientId: string;
}

export function PatientClinicalHistoryTab({
	patientId,
}: PatientClinicalHistoryTabProps) {
	const { data: records = [] } = useSoapRecordsV2(patientId);
	const createSoapRecord = useCreateSoapRecord();
	const [replicatingId, setReplicatingId] = useState<string | null>(null);

	const sessions = useMemo(
		() =>
			records.map((record) => ({
				id: record.id,
				session_date: record.recordDate,
				subjective: record.subjective,
				objective: record.objective,
				assessment: record.assessment,
				plan: record.plan,
				created_at: record.createdAt,
				pain_level_after: 0,
			})),
		[records],
	);

	const handleReplicate = async (session: (typeof sessions)[0]) => {
		if (!session.plan) {
			toast.error("Esta sessão não tem plano para replicar");
			return;
		}

		setReplicatingId(session.id);
		try {
			const today = new Date();
			const year = today.getFullYear();
			const month = String(today.getMonth() + 1).padStart(2, "0");
			const day = String(today.getDate()).padStart(2, "0");
			const dateStr = `${year}-${month}-${day}`;

			await createSoapRecord.mutateAsync({
				patient_id: patientId,
				record_date: dateStr,
				subjective: `Replicado de sessão ${session.session_date}`,
				objective: "",
				assessment: "",
				plan: session.plan,
			});
			toast.success("Conduta replicada com sucesso!");
		} catch (error) {
			toast.error("Erro ao replicar conduta");
			console.error(error);
		} finally {
			setReplicatingId(null);
		}
	};

	return (
		<div className="h-[600px]">
			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazySessionHistoryPanel
					sessions={sessions}
					onReplicate={handleReplicate}
					replicatingId={replicatingId}
				/>
			</Suspense>
		</div>
	);
}
