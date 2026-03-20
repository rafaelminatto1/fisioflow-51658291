import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Video, MapPin, CheckCircle2 } from "lucide-react";
import { useGoogleOAuth } from "@/hooks/useGoogleOAuth";
import { useToast } from "@/hooks/use-toast";

export default function Integrations() {
	const { toast } = useToast();
	const { connect, loading } = useGoogleOAuth();

	const handleConnectGoogle = async () => {
		try {
			await connect();
		} catch (error) {
			console.error(error);
			toast({
				title: "Erro",
				description: "Falha ao iniciar conexão.",
				variant: "destructive",
			});
		}
	};

	return (
		<MainLayout>
			<div className="space-y-8">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Integrações Google
					</h1>
					<p className="text-gray-500">
						Conecte o FisioFlow ao ecossistema Google Workspace.
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<Card>
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-blue-100 p-2">
									<Calendar className="h-6 w-6 text-blue-600" />
								</div>
								<CardTitle>Google Calendar</CardTitle>
							</div>
							<CardDescription>
								Sincronize sua agenda pessoal e profissional.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="mb-4 space-y-2 text-sm text-gray-600">
								<li className="flex gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" /> Bloqueia
									horários pessoais na agenda da clínica.
								</li>
								<li className="flex gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" /> Envia
									agendamentos para seu celular.
								</li>
							</ul>
							<Button
								onClick={handleConnectGoogle}
								className="w-full bg-blue-600 hover:bg-blue-700"
								disabled={loading}
							>
								{loading ? "Conectando..." : "Conectar Conta Google"}
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-green-100 p-2">
									<Video className="h-6 w-6 text-green-600" />
								</div>
								<CardTitle>Google Meet</CardTitle>
							</div>
							<CardDescription>
								Telemedicina integrada com um clique.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="mb-4 space-y-2 text-sm text-gray-600">
								<li className="flex gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" /> Cria links
									de reunião automaticamente.
								</li>
								<li className="flex gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" /> Sala de
									espera virtual.
								</li>
							</ul>
							<Button disabled variant="outline" className="w-full">
								Ativo (Via Conta Google)
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-red-100 p-2">
									<MapPin className="h-6 w-6 text-red-600" />
								</div>
								<CardTitle>Google Maps</CardTitle>
							</div>
							<CardDescription>
								Otimização de rotas e endereços.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="mb-4 space-y-2 text-sm text-gray-600">
								<li className="flex gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" />{" "}
									Autocomplete de endereços no cadastro.
								</li>
								<li className="flex gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" /> Mapas de
									localização para pacientes.
								</li>
							</ul>
							<Button disabled variant="outline" className="w-full">
								Ativo (API Key Configurada)
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</MainLayout>
	);
}
