// Lazy load LeadImport (contém exceljs - ~946KB) - só carrega quando a tab é acessada

import { useState, lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Users,
	CheckSquare,
	Send,
	Zap,
	BarChart3,
	Upload,
	Loader2,
	Bot,
} from "lucide-react";
import { LeadsContent } from "@/components/crm/LeadsContent";
import { CRMTarefas } from "@/components/crm/CRMTarefas";
import { CRMCampanhas } from "@/components/crm/CRMCampanhas";
import { CRMAutomacoes } from "@/components/crm/CRMAutomacoes";
import { CRMAnalytics } from "@/components/crm/CRMAnalytics";
import { CRMAutomationDashboard } from "@/components/crm/CRMAutomationDashboard";

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
				<div>
					<h1 className="text-3xl font-bold">CRM & Automações</h1>
					<p className="text-muted-foreground mt-1">
						Gerencie pacientes em potencial, campanhas, tarefas e os robôs do
						FisioFlow
					</p>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0 justify-start w-full">
						<TabsTrigger
							value="leads"
							className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<Users className="h-4 w-4" />
							<span>Leads</span>
						</TabsTrigger>
						<TabsTrigger
							value="campanhas"
							className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<Send className="h-4 w-4" />
							<span>Campanhas Manuais</span>
						</TabsTrigger>
						<TabsTrigger
							value="regras_automacao"
							className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<Zap className="h-4 w-4" />
							<span>Regras de Automação</span>
						</TabsTrigger>
						<TabsTrigger
							value="monitor_robo"
							className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 border border-transparent data-[state=active]:border-emerald-500/20 rounded-xl px-4 py-2"
						>
							<Bot className="h-4 w-4" />
							<span>Monitor do Robô (Ao vivo)</span>
						</TabsTrigger>
						<TabsTrigger
							value="tarefas"
							className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<CheckSquare className="h-4 w-4" />
							<span>Tarefas</span>
						</TabsTrigger>
						<TabsTrigger
							value="analytics"
							className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
						>
							<BarChart3 className="h-4 w-4" />
							<span>Analytics</span>
						</TabsTrigger>
						<TabsTrigger
							value="importar"
							className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 py-2"
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
