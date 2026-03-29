import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientMessages } from "@/components/communications/PatientMessages";
import { InternalChat } from "@/components/communications/InternalChat";
import { TemplateManager } from "@/components/communications/TemplateManager";
import { WhatsAppAutomation } from "@/components/communications/WhatsAppAutomation";
import { CompanyAnnouncements } from "@/components/communications/CompanyAnnouncements";
import { PolicyCompliance } from "@/components/communications/PolicyCompliance";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	MessageSquare as MessageSquareIcon,
	Users,
	FileText,
	Megaphone,
	ShieldCheck,
} from "lucide-react";

export default function CommunicationsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = searchParams.get("tab") || "patients";

	const handleTabChange = (value: string) => {
		setSearchParams({ tab: value });
	};

	return (
		<MainLayout>
			<div className="flex flex-col h-full space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
							<MessageSquareIcon className="h-4 w-4 text-primary" />
						</div>
						<div>
							<h1 className="text-xl font-semibold tracking-tight">
								Central de Comunicação
							</h1>
							<p className="text-sm text-muted-foreground">
								Hub central para mensagens com pacientes, equipe e diretrizes da
								clínica
							</p>
						</div>
					</div>
				</div>

				<Tabs
					value={activeTab}
					onValueChange={handleTabChange}
					className="flex-1 flex flex-col"
				>
					<TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-4 overflow-x-auto">
						<TabsTrigger
							value="patients"
							className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium shrink-0"
						>
							<MessageSquareIcon className="w-4 h-4 mr-2" />
							Pacientes
						</TabsTrigger>
						<TabsTrigger
							value="internal"
							className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium shrink-0"
						>
							<Users className="w-4 h-4 mr-2" />
							Chat Interno
						</TabsTrigger>
						<TabsTrigger
							value="announcements"
							className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium shrink-0"
						>
							<Megaphone className="w-4 h-4 mr-2" />
							Avisos
						</TabsTrigger>
						<TabsTrigger
							value="policies"
							className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium shrink-0"
						>
							<ShieldCheck className="w-4 h-4 mr-2" />
							Políticas
						</TabsTrigger>
						<TabsTrigger
							value="templates"
							className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium shrink-0"
						>
							<FileText className="w-4 h-4 mr-2" />
							Templates
						</TabsTrigger>
						<TabsTrigger
							value="whatsapp"
							className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium shrink-0"
						>
							<MessageSquareIcon className="w-4 h-4 mr-2" />
							WhatsApp
						</TabsTrigger>
					</TabsList>

					<AnimatePresence mode="wait">
						<motion.div
							key={activeTab}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2 }}
							className="flex-1"
						>
							<TabsContent value="patients" className="mt-0 h-full">
								<PatientMessages />
							</TabsContent>

							<TabsContent value="internal" className="mt-0 h-full">
								<InternalChat />
							</TabsContent>

							<TabsContent value="announcements" className="mt-0 h-full">
								<CompanyAnnouncements />
							</TabsContent>

							<TabsContent value="policies" className="mt-0 h-full">
								<PolicyCompliance />
							</TabsContent>

							<TabsContent value="templates" className="mt-0 h-full">
								<TemplateManager />
							</TabsContent>

							<TabsContent value="whatsapp" className="mt-0 h-full">
								<WhatsAppAutomation />
							</TabsContent>
						</motion.div>
					</AnimatePresence>
				</Tabs>
			</div>
		</MainLayout>
	);
}
