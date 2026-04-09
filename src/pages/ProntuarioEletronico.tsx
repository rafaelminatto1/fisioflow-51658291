/**
 * Prontuário Eletrônico — Visualização, Assinatura Digital e Exportação PDF
 * Acesso: /prontuario/:patientId
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ArrowLeft, FileText, Download, PenLine, CheckCircle, Calendar,
	User, Shield, Printer,
} from "lucide-react";
import { DigitalSignature, type SignatureData } from "@/components/signature/DigitalSignature";
import { SignedDocumentBadge } from "@/components/signature/SignedDocumentBadge";
import { generateSoapPDF, type SoapEvolution } from "@/lib/export/clinicalPdf";
import { toast } from "@/hooks/use-toast";
import { request } from "@/api/v2/base";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { documentSignaturesApi } from "@/api/v2";

// ─── API helpers ──────────────────────────────────────────────────────────────

function usePatientSessions(patientId: string) {
	return useQuery({
		queryKey: ["patient-sessions", patientId],
		queryFn: () =>
			request<{ data: Array<Record<string, unknown>> }>(
				`/api/sessions?patient_id=${patientId}&limit=20`,
			).then((r) => r.data ?? []),
		enabled: !!patientId,
		staleTime: 2 * 60 * 1000,
	});
}

function usePatient(patientId: string) {
	return useQuery({
		queryKey: ["patient", patientId],
		queryFn: () =>
			request<{ data: Record<string, unknown> }>(
				`/api/patients/${patientId}`,
			).then((r) => r.data),
		enabled: !!patientId,
		staleTime: 5 * 60 * 1000,
	});
}

function useSessionSignatures(sessionId: string) {
	return useQuery({
		queryKey: ["session-signatures", sessionId],
		queryFn: () => documentSignaturesApi.list(sessionId).then((r) => r.data ?? []),
		enabled: !!sessionId,
		staleTime: 60 * 1000,
	});
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
	session,
	patientName,
	therapistName,
	clinicName,
	onSelect,
	isSelected,
}: {
	session: Record<string, unknown>;
	patientName: string;
	therapistName: string;
	clinicName: string;
	onSelect: () => void;
	isSelected: boolean;
}) {
	const dateStr = session.date
		? format(parseISO(session.date as string), "dd/MM/yyyy", { locale: ptBR })
		: "Data desconhecida";

	return (
		<button
			className={`w-full text-left p-3 rounded-xl border transition-colors hover:border-primary/50 ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}
			onClick={onSelect}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
					<span className="text-sm font-medium">{dateStr}</span>
				</div>
				{session.is_signed && (
					<Badge className="rounded-lg text-[10px] bg-emerald-100 text-emerald-700 shrink-0">
						Assinado
					</Badge>
				)}
			</div>
			{session.diagnosis && (
				<p className="text-xs text-muted-foreground mt-1 truncate">{session.diagnosis as string}</p>
			)}
		</button>
	);
}

// ─── Session Detail ────────────────────────────────────────────────────────────

function SessionDetail({
	session,
	patientName,
	therapistName,
	clinicName,
}: {
	session: Record<string, unknown>;
	patientName: string;
	therapistName: string;
	clinicName: string;
}) {
	const qc = useQueryClient();
	const [showSignature, setShowSignature] = useState(false);
	const { data: signatures = [] } = useSessionSignatures(session.id as string);
	const isSigned = signatures.length > 0;

	const signMutation = useMutation({
		mutationFn: async (signatureData: SignatureData) => {
			return documentSignaturesApi.create({
				document_id: session.id as string,
				document_type: "session",
				signer_name: signatureData.signerName,
				signature_hash: signatureData.hash,
				signature_image: signatureData.imageData,
				signed_at: signatureData.timestamp,
			} as Record<string, unknown>);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["session-signatures", session.id] });
			toast({ title: "Assinatura registrada com sucesso!" });
			setShowSignature(false);
		},
		onError: () => toast({ title: "Erro ao salvar assinatura", variant: "destructive" }),
	});

	const handleExportPDF = () => {
		const sig = signatures[0] as Record<string, unknown> | undefined;
		const evolution: SoapEvolution = {
			id: session.id as string,
			date: (session.date as string) ?? new Date().toISOString(),
			patient_name: patientName,
			therapist_name: therapistName,
			clinic_name: clinicName,
			subjective: session.subjective as string | undefined,
			objective: session.objective as string | undefined,
			assessment: session.assessment as string | undefined,
			plan: session.plan as string | undefined,
			pain_level: session.pain_level as number | undefined,
			diagnosis: session.diagnosis as string | undefined,
			signature_image: sig?.signature_image as string | undefined,
			signed_at: sig ? format(parseISO(sig.signed_at as string), "dd/MM/yyyy 'às' HH:mm") : undefined,
		};
		generateSoapPDF(evolution);
	};

	const dateStr = session.date
		? format(parseISO(session.date as string), "dd/MM/yyyy", { locale: ptBR })
		: "";

	const fields: Array<{ label: string; value: string | undefined; sectionTitle?: string }> = [
		{ sectionTitle: "S — Subjetivo", label: "", value: session.subjective as string },
		{ sectionTitle: "O — Objetivo", label: "", value: session.objective as string },
		{ sectionTitle: "A — Avaliação/Diagnóstico", label: "", value: session.assessment as string },
		{ sectionTitle: "P — Plano", label: "", value: session.plan as string },
	];

	return (
		<div className="space-y-4">
			{/* Actions bar */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Calendar className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-semibold">{dateStr}</span>
					{isSigned ? (
						<SignedDocumentBadge status="signed" />
					) : (
						<Badge variant="outline" className="rounded-lg text-[10px]">Não assinado</Badge>
					)}
				</div>
				<div className="flex items-center gap-2">
					{!isSigned && (
						<Button
							size="sm" variant="outline" className="gap-1.5 h-8"
							onClick={() => setShowSignature(!showSignature)}
						>
							<PenLine className="h-3.5 w-3.5" />
							Assinar
						</Button>
					)}
					<Button size="sm" className="gap-1.5 h-8" onClick={handleExportPDF}>
						<Download className="h-3.5 w-3.5" />
						PDF
					</Button>
				</div>
			</div>

			{/* SOAP fields */}
			{session.pain_level !== undefined && (
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-muted-foreground">EVA:</span>
					<div className="flex gap-1">
						{Array.from({ length: 10 }).map((_, i) => (
							<div
								key={i}
								className={`h-3 w-3 rounded-sm ${i < Number(session.pain_level) ? "bg-red-400" : "bg-muted"}`}
							/>
						))}
					</div>
					<span className="text-xs">{session.pain_level}/10</span>
				</div>
			)}

			{fields.map(
				(f, i) =>
					f.value && (
						<div key={i} className="space-y-1">
							<p className="text-xs font-bold text-primary uppercase tracking-wider">{f.sectionTitle}</p>
							<div className="rounded-lg bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">
								{f.value}
							</div>
						</div>
					),
			)}

			{/* Signature panel */}
			{showSignature && !isSigned && (
				<div className="mt-2">
					<DigitalSignature
						documentId={session.id as string}
						documentTitle={`Evolução — ${dateStr}`}
						signerName={therapistName}
						onSign={(data) => signMutation.mutate(data)}
						mode="capture"
					/>
				</div>
			)}

			{/* Signed info */}
			{isSigned && signatures[0] && (
				<div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700">
					<CheckCircle className="h-4 w-4 shrink-0" />
					<span>
						Assinado por <strong>{(signatures[0] as Record<string, unknown>).signer_name as string}</strong>{" "}
						em {format(parseISO((signatures[0] as Record<string, unknown>).signed_at as string), "dd/MM/yyyy 'às' HH:mm")}
					</span>
				</div>
			)}
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProntuarioEletronico() {
	const { patientId } = useParams<{ patientId: string }>();
	const navigate = useNavigate();
	const { profile } = useAuth();
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

	const { data: patient, isLoading: patientLoading } = usePatient(patientId ?? "");
	const { data: sessions = [], isLoading: sessionsLoading } = usePatientSessions(patientId ?? "");

	const patientName = (patient?.full_name as string) ?? "Paciente";
	const therapistName = profile?.full_name ?? "Fisioterapeuta";
	const clinicName = "FisioFlow Clínica";

	const selectedSession = sessions.find((s) => (s as Record<string, unknown>).id === selectedSessionId) as
		| Record<string, unknown>
		| undefined;

	return (
		<MainLayout compactPadding>
			<div className="p-4 space-y-4">
				{/* Header */}
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
						<ArrowLeft className="h-4 w-4" />
						Voltar
					</Button>
					<div className="flex items-center gap-2">
						<div className="p-2 bg-primary/10 rounded-xl">
							<FileText className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h1 className="text-lg font-bold">Prontuário Eletrônico</h1>
							{patientLoading ? (
								<Skeleton className="h-4 w-32 mt-0.5" />
							) : (
								<p className="text-xs text-muted-foreground flex items-center gap-1">
									<User className="h-3 w-3" />
									{patientName}
								</p>
							)}
						</div>
					</div>
					<div className="ml-auto flex items-center gap-2">
						<Badge variant="outline" className="rounded-lg gap-1 text-[10px]">
							<Shield className="h-3 w-3" />
							Prontuário Protegido
						</Badge>
					</div>
				</div>

				<div className="grid lg:grid-cols-[280px_1fr] gap-4">
					{/* Session list sidebar */}
					<div className="space-y-2">
						<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Evoluções ({sessions.length})
						</p>
						{sessionsLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-14 rounded-xl" />
							))
						) : sessions.length === 0 ? (
							<Card className="border-dashed">
								<CardContent className="py-8 text-center text-xs text-muted-foreground">
									Nenhuma evolução registrada
								</CardContent>
							</Card>
						) : (
							sessions.map((session) => {
								const s = session as Record<string, unknown>;
								return (
									<SessionCard
										key={s.id as string}
										session={s}
										patientName={patientName}
										therapistName={therapistName}
										clinicName={clinicName}
										onSelect={() => setSelectedSessionId(s.id as string)}
										isSelected={selectedSessionId === s.id}
									/>
								);
							})
						)}
					</div>

					{/* Session detail */}
					<Card className="border shadow-sm">
						<CardContent className="p-4">
							{!selectedSession ? (
								<div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-muted-foreground">
									<Printer className="h-10 w-10 opacity-30" />
									<div>
										<p className="font-medium text-sm">Selecione uma evolução</p>
										<p className="text-xs mt-1">Clique em uma entrada à esquerda para ver os detalhes</p>
									</div>
								</div>
							) : (
								<SessionDetail
									session={selectedSession}
									patientName={patientName}
									therapistName={therapistName}
									clinicName={clinicName}
								/>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</MainLayout>
	);
}
