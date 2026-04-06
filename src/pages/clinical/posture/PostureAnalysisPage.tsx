import React from "react";
import { User } from "lucide-react";

import { BiomechanicsAnalysisLayout } from "@/components/analysis/evidence/BiomechanicsAnalysisLayout";
import { PostureAnalysisStudio } from "@/components/analysis/studios/PostureAnalysisStudio";

export default function PostureAnalysisPage() {
	return (
		<BiomechanicsAnalysisLayout
			mode="posture"
			title="Postura & Escoliose"
			subtitle="SAPO / Adams / Fotogrametria"
			icon={User}
			iconBgClassName="border-purple-500/20 bg-purple-500/10"
			iconClassName="text-purple-500"
		>
			<PostureAnalysisStudio />
		</BiomechanicsAnalysisLayout>
	);
}
