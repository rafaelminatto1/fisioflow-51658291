// Lazy load LeadImport (contém exceljs - ~946KB) - só carrega quando a tab é acessada

import {
	BarChart3,
	Bot,
	CheckSquare,
	Loader2,
	Send,
	Upload,
	Users,
	Zap,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { CRMAnalytics } from "@/components/crm/CRMAnalytics";
import { CRMAutomacoes } from "@/components/crm/CRMAutomacoes";
import { CRMAutomationDashboard } from "@/components/crm/CRMAutomationDashboard";
import { CRMCampanhas } from "@/components/crm/CRMCampanhas";
import { CRMTarefas } from "@/components/crm/CRMTarefas";
import { LeadsContent } from "@/components/crm/LeadsContent";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LeadImport = lazy(() =>
	import("@/components/crm/LeadImport").then((m) => ({
		default: m.LeadImport,
	})),
);

export default function CRMDashboard() {
	const [activeTab, setActiveTab] = useState("leads");

	return (
		<MainLayout>
			<div className="space-y-6">
				<div className="gradient-brand-light rounded-3xl p-8 border border-primary/20 card-premium-hover">
					<h1 className="font-display text-4xl font-black tracking-tighter mb-2 text-primary">
						CRM & Automações
					</h1>
					<p className="text-muted-foreground mt-1 font-medium text-lg">
						Gerencie pacientes em potencial, campanhas, tarefas e os robôs do
						FisioFlow
					</p>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0 justify-start w-full">
						<TabsTrigger
							value="leads"
							className="magnetic-button gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<Users className="h-4 w-4" />
							<span>Leads</span>
						</TabsTrigger>
						<TabsTrigger
							value="campanhas"
							className="magnetic-button gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<Send className="h-4 w-4" />
							<span>Campanhas Manuais</span>
						</TabsTrigger>
						<TabsTrigger
							value="regresos_automacao"
							className="magnetic-button gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<Zap className="h-4 w-4" />
							<span>Regas de Automação</span>
						</TabsTrigger>
						<TabsTrigger
							value="monitor_robo"
							className="magnetic-button gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 border border-transparent data-[state=active]:border-emerald-500/20 rounded-xl px-4 py-2"
						>
							<Bot className="h-4 w-4" />
							<span>Monitor do Robô (Ao vivo)</span>
						</TabsTrigger>
						<TabsTrigger
							value="tarefas"
							className="magnetic-button gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<CheckSquare className="h-4 w-4" />
							<span>Tarefas</span>
						</TabsTrigger>
						<TabsTrigger
							value="analytics"
							className="magnetic-button gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<BarChart3 className="h-4 w-4" />
							<span>Analytics</span>
						</TabsTrigger>
						<TabsTrigger
							value="importar"
							className="magnetic-button gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<Upload className="h-4 w-4" />
							<span>Importar</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value="leads"
						className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
					>
						<LeadsContent />
					</TabsContent>

					<TabsContent
						value="campanhas"
						className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
					>
						<CRMCampanhas />
					</TabsContent>

					<TabsContent
						value="regras_automacao"
						className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
					>
						<CRMAutomacoes />
					</TabsContent>

					<TabsContent
						value="monitor_robo"
						className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
					>
						<CRMAutomationDashboard />
					</TabsContent>

					<TabsContent
						value="tarefas"
						className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
					>
						<CRMTarefas />
					</TabsContent>

					<TabsContent
						value="analytics"
						className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
					>
						<CRMAnalytics />
					</TabsContent>

					<TabsContent
						value="importar"
						className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
					>
						<Suspense
							fallback={
								<div className="flex items-center justify-center py-20">
									<div className="text-center space-y-4">
										<Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
										<p className="text-muted-foreground">
											Carregando importador seguro...
										</p>
									</div>
								</div>
							}
						>
							<LeadImport />
						</Suspense>
					</TabsContent>
				</Tabs>
			</div>
		</MainLayout>
	);
}
