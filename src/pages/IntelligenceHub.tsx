import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { Brain, Stethoscope, BarChart3 } from "lucide-react";

import { SmartDashboardContent } from "./SmartDashboard";
import { SmartAIContent } from "./SmartAI";
import { AdvancedAnalyticsContent } from "./AdvancedAnalytics";

export default function IntelligenceHub() {
	const [searchParams, setSearchParams] = useSearchParams();
	const tab = searchParams.get("tab") || "clinica";

	const handleTabChange = (val: string) => {
		setSearchParams(
			(currentParams) => {
				const nextParams = new URLSearchParams(currentParams);
				nextParams.set("tab", val);
				return nextParams;
			},
			{ replace: true },
		);
	};

	return (
		<PageLayout>
			<PageContainer>
				<PageHeader
					title={
						<>
							<Brain className="w-6 h-6" />
							Hub de Inteligência
						</>
					}
					subtitle="Central de insights, assistentes virtuais e visão estratégica"
				/>
				<div className="flex flex-col h-[calc(100vh-theme(spacing.16))] pt-4 px-4 md:px-8">
					<Tabs
						value={tab}
						onValueChange={handleTabChange}
						className="flex-1 flex flex-col min-h-0"
					>
						<TabsList className="grid grid-cols-3 w-full md:w-auto md:inline-grid mb-4 shrink-0 bg-muted/50 border border-border/50 p-1 rounded-xl">
							<TabsTrigger
								value="clinica"
								className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-9"
							>
								<Stethoscope className="w-4 h-4 hidden sm:block" />
								Clínica
							</TabsTrigger>
							<TabsTrigger
								value="analise"
								className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-9"
							>
								<BarChart3 className="w-4 h-4 hidden sm:block" />
								Análise
							</TabsTrigger>
							<TabsTrigger
								value="ai"
								className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-9"
							>
								<Brain className="w-4 h-4 hidden sm:block" />
								Assistente IA
							</TabsTrigger>
						</TabsList>

						<div className="flex-1 min-h-0 relative">
							<TabsContent
								value="clinica"
								className="absolute inset-0 m-0 data-[state=inactive]:hidden overflow-y-auto no-scrollbar pb-6 outline-none"
							>
								<SmartDashboardContent />
							</TabsContent>

							<TabsContent
								value="analise"
								className="absolute inset-0 m-0 data-[state=inactive]:hidden overflow-y-auto no-scrollbar pb-6 outline-none"
							>
								<AdvancedAnalyticsContent />
							</TabsContent>

							<TabsContent
								value="ai"
								className="absolute inset-0 m-0 data-[state=inactive]:hidden outline-none"
							>
								<SmartAIContent />
							</TabsContent>
						</div>
					</Tabs>
				</div>
			</PageContainer>
		</PageLayout>
	);
}
