import { Suspense, useMemo } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useSoapRecordsV2 } from "@/hooks/useSoapRecordsV2";
import { lazy } from "react";

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

	return (
		<div className="h-[600px]">
			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazySessionHistoryPanel sessions={sessions} onReplicate={() => {}} />
			</Suspense>
		</div>
	);
}
