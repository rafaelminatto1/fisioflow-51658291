import React, { Suspense, lazy, useMemo } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { usePatientLifecycleSummary } from "@/hooks/usePatientAnalytics";
import { useSoapRecordsV2 } from "@/hooks/useSoapRecordsV2";

const LazyPatientAnalyticsDashboard = lazy(() =>
	import("@/components/patient/analytics/PatientAnalyticsDashboard").then(
		(m) => ({ default: m.PatientAnalyticsDashboard }),
	),
);
const LazyAIAssistantPanel = lazy(() =>
	import("@/components/patient/analytics/AIAssistantPanel").then((m) => ({
		default: m.AIAssistantPanel,
	})),
);
const LazyPatientAIChat = lazy(() =>
	import("@/components/ai/PatientAIChat").then((m) => ({
		default: m.PatientAIChat,
	})),
);
const LazyPatientSmartSummary = lazy(() =>
	import("@/components/ai/PatientSmartSummary").then((m) => ({
		default: m.PatientSmartSummary,
	})),
);
const LazyDoctorReferralReportGenerator = lazy(() =>
	import("@/components/reports/DoctorReferralReportGenerator").then((m) => ({
		default: m.DoctorReferralReportGenerator,
	})),
);
const LazyPatientLifecycleChart = lazy(() =>
	import("@/components/patient/analytics/PatientLifecycleChart").then((m) => ({
		default: m.PatientLifecycleChart,
	})),
);
const LazyPatientInsightsPanel = lazy(() =>
	import("@/components/patient/analytics/PatientInsightsPanel").then((m) => ({
		default: m.PatientInsightsPanel,
	})),
);

interface PatientAnalyticsTabProps {
	patientId: string;
	patientName: string;
	birthDate?: string;
	condition: string;
}

export function PatientAnalyticsTab({
	patientId,
	patientName,
	birthDate,
	condition,
}: PatientAnalyticsTabProps) {
	const { data: lifecycleSummary, isLoading: lifecycleLoading } =
		usePatientLifecycleSummary(patientId);
	const { data: records = [] } = useSoapRecordsV2(patientId);

	const summaryHistory = useMemo(
		() =>
			records.map((r) => ({
				date: r.recordDate,
				subjective: r.subjective,
				objective: r.objective,
			})),
		[records],
	);

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2">
					<Suspense fallback={<LoadingSkeleton type="card" />}>
						<LazyPatientSmartSummary
							patientId={patientId}
							patientName={patientName}
							condition={condition}
							history={summaryHistory}
						/>
					</Suspense>
				</div>
				<div className="lg:col-span-1">
					<Suspense fallback={<LoadingSkeleton type="card" />}>
						<LazyDoctorReferralReportGenerator
							patientId={patientId}
							patientName={patientName}
							birthDate={birthDate}
							condition={condition}
						/>
					</Suspense>
				</div>
			</div>

			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazyPatientAnalyticsDashboard
					patientId={patientId}
					patientName={patientName}
				/>
			</Suspense>

			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazyAIAssistantPanel patientId={patientId} patientName={patientName} />
			</Suspense>

			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazyPatientAIChat patientId={patientId} patientName={patientName} />
			</Suspense>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Suspense fallback={<LoadingSkeleton type="card" />}>
					<LazyPatientLifecycleChart
						summary={lifecycleSummary || null}
						isLoading={lifecycleLoading}
					/>
				</Suspense>

				<Suspense fallback={<LoadingSkeleton type="card" />}>
					<LazyPatientInsightsPanel
						patientId={patientId}
						limit={5}
						showHeader={true}
					/>
				</Suspense>
			</div>
		</div>
	);
}
