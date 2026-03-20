import React from "react";
import { useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	telemedicineApi,
	type TelemedicineRoomRecord,
} from "@/lib/api/workers-client";
import { Video, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TelemedicineRoom() {
	const { roomId } = useParams();
	const queryClient = useQueryClient();

	const { data: room, isLoading } = useQuery({
		queryKey: ["telemedicine-room", roomId],
		queryFn: async () => {
			if (!roomId) return null;
			const res = await telemedicineApi.rooms.get(roomId);
			return (res?.data ?? null) as TelemedicineRoomRecord | null;
		},
		enabled: !!roomId,
	});

	const startMeeting = useMutation({
		mutationFn: async () => {
			if (!roomId) throw new Error("Sala inválida");
			const res = await telemedicineApi.rooms.start(roomId);
			return (res?.data ?? null) as TelemedicineRoomRecord | null;
		},
		onSuccess: (data) => {
			queryClient.setQueryData(["telemedicine-room", roomId], data);
			queryClient.invalidateQueries({ queryKey: ["telemedicine-rooms"] });
			toast.success("Sala iniciada");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao iniciar sala");
		},
	});

	const meetingLink = room?.meeting_url ?? "";

	return (
		<MainLayout>
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
				<Card className="w-full max-w-md p-8 text-center space-y-6">
					<div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
						<Video className="w-10 h-10 text-green-600" />
					</div>

					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							Sala de Telemedicina
						</h1>
						<p className="text-gray-500 mt-2">
							{room?.patients?.name
								? `Paciente: ${room.patients.name}`
								: "Consulta online"}
						</p>
					</div>

					{isLoading ? (
						<div className="flex justify-center py-4">
							<Loader2 className="w-6 h-6 animate-spin text-green-600" />
						</div>
					) : !meetingLink ? (
						<Button
							onClick={() => startMeeting.mutate()}
							disabled={startMeeting.isPending}
							className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
						>
							{startMeeting.isPending ? "Iniciando..." : "Iniciar Reunião"}
						</Button>
					) : (
						<div className="space-y-4">
							<div className="p-4 bg-gray-100 rounded-lg break-all text-sm">
								{meetingLink}
							</div>

							<div className="flex gap-3">
								<Button
									variant="outline"
									className="flex-1"
									onClick={() => {
										navigator.clipboard.writeText(meetingLink);
										toast.success("Link copiado");
									}}
								>
									<Copy className="w-4 h-4 mr-2" /> Copiar
								</Button>
								<Button
									className="flex-1 bg-green-600 hover:bg-green-700"
									onClick={() => window.open(meetingLink, "_blank")}
								>
									<ExternalLink className="w-4 h-4 mr-2" /> Entrar
								</Button>
							</div>

							<p className="text-xs text-gray-500">
								O link abrirá em uma nova aba segura da sala de
								videoconferência.
							</p>
						</div>
					)}
				</Card>
			</div>
		</MainLayout>
	);
}
