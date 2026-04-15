import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MainLayout } from "@/components/layout/MainLayout";
import { Brain, LayoutDashboard, BarChart3, Presentation } from "lucide-react";

// Components
import { SmartDashboardContent } from "./SmartDashboard";
import { SmartAIContent } from "./SmartAI";
import { AdvancedAnalyticsContent } from "./AdvancedAnalytics";
import { BIDashboardContent } from "./BIDashboard";

export default function IntelligenceHub() {
	const [searchParams, setSearchParams] = useSearchParams();
	const tab = searchParams.get("tab") || "dashboard";

	const handleTabChange = (val: string) => {
		setSearchParams({ tab: val });
	};

	return (
		<MainLayout fullWidth compactPadding>
			<div className="flex flex-col h-[calc(100vh-theme(spacing.16))] pt-4 px-4 md:px-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
					<div>
						<h1 className="text-2xl font-black flex items-center gap-2 font-display text-primary">
							<Brain className="w-6 h-6" />
							Hub de Inteligência
						</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Central de insights, assistentes virtuais e visão estratégica
						</p>
					</div>
				</div>

				<Tabs
					value={tab}
					onValueChange={handleTabChange}
					className="flex-1 flex flex-col min-h-0"
				>
					<TabsList className="grid grid-cols-4 w-full md:w-auto md:inline-grid mb-4 shrink-0 bg-muted/50 backdrop-blur-sm border border-border/50 p-1 rounded-xl">
						<TabsTrigger value="dashboard" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-9">
							<LayoutDashboard className="w-4 h-4 hidden sm:block" />
							Visão Geral
						</TabsTrigger>
						<TabsTrigger value="ai" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-9">
							<Brain className="w-4 h-4 hidden sm:block" />
							Assistente
						</TabsTrigger>
						<TabsTrigger value="analytics" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-9">
							<BarChart3 className="w-4 h-4 hidden sm:block" />
							Analytics
						</TabsTrigger>
						<TabsTrigger value="bi" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-9">
							<Presentation className="w-4 h-4 hidden sm:block" />
							BI
						</TabsTrigger>
					</TabsList>

					<div className="flex-1 min-h-0 relative">
						<TabsContent value="dashboard" className="absolute inset-0 m-0 data-[state=inactive]:hidden overflow-y-auto no-scrollbar pb-6 outline-none">
							<SmartDashboardContent />
						</TabsContent>

						<TabsContent value="ai" className="absolute inset-0 m-0 data-[state=inactive]:hidden outline-none">
							<SmartAIContent />
						</TabsContent>

						<TabsContent value="analytics" className="absolute inset-0 m-0 data-[state=inactive]:hidden overflow-y-auto no-scrollbar pb-6 outline-none">
							<AdvancedAnalyticsContent />
						</TabsContent>

						<TabsContent value="bi" className="absolute inset-0 m-0 data-[state=inactive]:hidden outline-none">
							<BIDashboardContent />
						</TabsContent>
					</div>
				</Tabs>
			</div>
		</MainLayout>
	);
}
