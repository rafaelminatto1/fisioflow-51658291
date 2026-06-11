import React, { useState } from "react";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PosturalAssessment } from "@/components/physiotherapy/PosturalAssessment";
import { TreatmentPlan } from "@/components/physiotherapy/TreatmentPlan";
import { ProgressTracking } from "@/components/physiotherapy/ProgressTracking";
import { Activity, User, TrendingUp, ClipboardList } from "lucide-react";

const PhysiotherapyHub = () => {
	const [activeTab, setActiveTab] = useState("assessment");

	return (
		<PageLayout>
			<PageContainer>
				<PageHeader
					title="Central Fisioterapêutica"
					subtitle="Avaliação, tratamento e acompanhamento de pacientes"
				/>
				<div className="space-y-4 sm:space-y-6 animate-fade-in px-1 sm:px-0">
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="space-y-4 sm:space-y-6"
					>
						<TabsList className="grid w-full grid-cols-3 h-12 sm:h-auto">
							<TabsTrigger
								value="assessment"
								className="flex items-center gap-2 text-xs sm:text-sm"
							>
								<User className="w-4 h-4" />
								<span className="hidden sm:inline">Avaliação</span>
							</TabsTrigger>
							<TabsTrigger
								value="treatment"
								className="flex items-center gap-2 text-xs sm:text-sm"
							>
								<ClipboardList className="w-4 h-4" />
								<span className="hidden sm:inline">Tratamento</span>
							</TabsTrigger>
							<TabsTrigger
								value="progress"
								className="flex items-center gap-2 text-xs sm:text-sm"
							>
								<TrendingUp className="w-4 h-4" />
								<span className="hidden sm:inline">Progresso</span>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="assessment">
							<PosturalAssessment />
						</TabsContent>

						<TabsContent value="treatment">
							<TreatmentPlan />
						</TabsContent>

						<TabsContent value="progress">
							<ProgressTracking />
						</TabsContent>
					</Tabs>
				</div>
			</PageContainer>
		</PageLayout>
	);
};

export default PhysiotherapyHub;
