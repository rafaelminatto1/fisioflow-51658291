import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientMessages } from "@/components/communications/PatientMessages";
import { InternalChat } from "@/components/communications/InternalChat";
import { TemplateManager } from "@/components/communications/TemplateManager";
import { MessageSquare, Users, FileText } from "lucide-react";

export default function CommunicationsPage() {
	return (
		<MainLayout>
			<div className="flex flex-col h-full space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
							<MessageSquare className="h-4 w-4 text-primary" />
						</div>
						<div>
							<h1 className="text-xl font-semibold">Central de Comunicação</h1>
							<p className="text-sm text-muted-foreground">
								Gerencie mensagens com pacientes e equipe interna
							</p>
						</div>
					</div>
				</div>

				<Tabs defaultValue="patients" className="flex-1 flex flex-col">
					<TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-4">
						<TabsTrigger
							value="patients"
							className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium"
						>
							<MessageSquare className="w-4 h-4 mr-2" />
							Pacientes
						</TabsTrigger>
						<TabsTrigger
							value="internal"
							className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium"
						>
							<Users className="w-4 h-4 mr-2" />
							Chat Interno
						</TabsTrigger>
						<TabsTrigger
							value="templates"
							className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium"
						>
							<FileText className="w-4 h-4 mr-2" />
							Templates
						</TabsTrigger>
					</TabsList>

					<TabsContent value="patients" className="mt-0 flex-1">
						<PatientMessages />
					</TabsContent>

					<TabsContent value="internal" className="mt-0 flex-1">
						<InternalChat />
					</TabsContent>

					<TabsContent value="templates" className="mt-0 flex-1">
						<TemplateManager />
					</TabsContent>
				</Tabs>
			</div>
		</MainLayout>
	);
}
