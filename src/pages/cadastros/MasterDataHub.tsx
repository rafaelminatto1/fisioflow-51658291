import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	FileText,
	Stethoscope,
	Building2,
	Settings,
	FileSignature,
	ClipboardList,
	Target,
	CalendarOff,
	FileCheck,
} from "lucide-react";
import { ServicosContent } from "./ServicosPage";
import { DoctorManagementContent } from "../DoctorManagement";
import { FornecedoresContent } from "./FornecedoresPage";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function MasterDataHub() {
	return (
		<MainLayout>
			<div className="p-6 max-w-7xl mx-auto space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Hub de Cadastros
					</h1>
					<p className="text-muted-foreground mt-1">
						Gestão centralizada de dados mestres, parceiros e configurações
						clínicas
					</p>
				</div>

				<Tabs defaultValue="services" className="w-full">
					<TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl">
						<TabsTrigger
							value="services"
							className="rounded-lg py-2.5 flex items-center gap-2"
						>
							<FileText className="h-4 w-4" />
							Serviços
						</TabsTrigger>
						<TabsTrigger
							value="doctors"
							className="rounded-lg py-2.5 flex items-center gap-2"
						>
							<Stethoscope className="h-4 w-4" />
							Médicos
						</TabsTrigger>
						<TabsTrigger
							value="partners"
							className="rounded-lg py-2.5 flex items-center gap-2"
						>
							<Building2 className="h-4 w-4" />
							Parceiros
						</TabsTrigger>
						<TabsTrigger
							value="config"
							className="rounded-lg py-2.5 flex items-center gap-2"
						>
							<Settings className="h-4 w-4" />
							Configurações
						</TabsTrigger>
					</TabsList>

					<TabsContent value="services" className="mt-6">
						<ServicosContent />
					</TabsContent>

					<TabsContent value="doctors" className="mt-6">
						<DoctorManagementContent />
					</TabsContent>

					<TabsContent value="partners" className="mt-6">
						<FornecedoresContent />
					</TabsContent>

					<TabsContent value="config" className="mt-6">
						<div className="grid gap-6 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="text-lg flex items-center gap-2">
										<FileSignature className="h-5 w-5 text-blue-500" />
										Documentos e Contratos
									</CardTitle>
									<CardDescription>
										Templates de contratos, termos e documentos legais
									</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-2">
									<Button variant="outline" className="justify-start" asChild>
										<Link to="/cadastros/contratos">Gerenciar Contratos</Link>
									</Button>
									<Button variant="outline" className="justify-start" asChild>
										<Link to="/cadastros/atestados">Modelos de Atestados</Link>
									</Button>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-lg flex items-center gap-2">
										<ClipboardList className="h-5 w-5 text-emerald-500" />
										Clínico
									</CardTitle>
									<CardDescription>
										Formulários de avaliação e objetivos terapêuticos
									</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-2">
									<Button variant="outline" className="justify-start" asChild>
										<Link to="/cadastros/fichas-avaliacao">
											Fichas de Avaliação
										</Link>
									</Button>
									<Button variant="outline" className="justify-start" asChild>
										<Link to="/cadastros/objetivos">Objetivos Padrão</Link>
									</Button>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-lg flex items-center gap-2">
										<CalendarOff className="h-5 w-5 text-amber-500" />
										Agenda e Operação
									</CardTitle>
									<CardDescription>
										Feriados e horários especiais da clínica
									</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-2">
									<Button variant="outline" className="justify-start" asChild>
										<Link to="/cadastros/feriados">Gerenciar Feriados</Link>
									</Button>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</MainLayout>
	);
}
