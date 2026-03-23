import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Database,
	FileUp,
	HardDriveDownload,
	Loader2,
	RefreshCw,
	Upload,
} from "lucide-react";
import { dicomApi } from "@/api/v2";
import { fisioLogger as logger } from "@/lib/errors/logger";
import {
	clearTrackedTransferSyntaxes,
	getTrackedCodecSummaries,
	getTrackedTransferSyntaxDetails,
	getCodecRecommendations,
	type TrackedTransferSyntax,
} from "@/components/analysis/dicom/transferSyntaxTracker";

const DicomViewer = lazy(() => import("@/components/analysis/dicom/DicomViewer"));
const DicomBrowser = lazy(() => import("@/components/analysis/dicom/DicomBrowser"));

type WorkspaceMode = "browser" | "upload";

const LoadingFallback = () => (
	<div className="flex min-h-[320px] items-center justify-center">
		<div className="flex flex-col items-center gap-3 text-center">
			<Loader2 className="h-8 w-8 animate-spin text-primary" />
			<p className="text-sm text-muted-foreground">
				Carregando workspace DICOM...
			</p>
		</div>
	</div>
);

export default function DicomWorkspacePage() {
	const [mode, setMode] = useState<WorkspaceMode>("browser");
	const [file, setFile] = useState<File | null>(null);
	const [dicomRemoteEnabled, setDicomRemoteEnabled] = useState(false);
	const [dicomConfigLoading, setDicomConfigLoading] = useState(true);
	const [trackedSyntaxes, setTrackedSyntaxes] = useState<TrackedTransferSyntax[]>(
		[],
	);

	const refreshAudit = () => {
		setTrackedSyntaxes(getTrackedTransferSyntaxDetails());
	};

	useEffect(() => {
		let mounted = true;

		const loadConfig = async () => {
			try {
				const response = await dicomApi.config();
				if (mounted) {
					setDicomRemoteEnabled(Boolean(response.data?.enabled));
				}
			} catch (error) {
				logger.warn(
					"Falha ao obter configuração DICOM",
					error,
					"DicomWorkspacePage",
				);
				if (mounted) {
					setDicomRemoteEnabled(false);
				}
			} finally {
				if (mounted) {
					setDicomConfigLoading(false);
				}
			}
		};

		void loadConfig();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		refreshAudit();
	}, [mode, file]);

	const resetAudit = () => {
		clearTrackedTransferSyntaxes();
		refreshAudit();
	};

	const onDrop = (acceptedFiles: File[]) => {
		const selected = acceptedFiles[0];
		if (!selected) return;
		setFile(selected);
		setMode("upload");
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/dicom": [".dcm"],
			"application/octet-stream": [".dcm"],
		},
		multiple: false,
	});

	const trackedFamilies = useMemo(
		() =>
			Array.from(new Set(trackedSyntaxes.map((item) => item.codec))).filter(
				(item) => item !== "native" && item !== "unknown",
			),
		[trackedSyntaxes],
	);
	const codecRecommendations = useMemo(
		() => getCodecRecommendations(),
		[trackedSyntaxes],
	);
	const codecSummaries = useMemo(
		() => getTrackedCodecSummaries(),
		[trackedSyntaxes],
	);

	return (
		<MainLayout>
			<div className="space-y-6">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Workspace DICOM</h1>
						<p className="max-w-2xl text-sm text-muted-foreground">
							Entrada dedicada para PACS, estudos remotos e arquivos DICOM locais.
							Aqui fica a auditoria dos `Transfer Syntax UID` usados de verdade,
							que é a base para cortar codecs sem quebrar estudos clínicos.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							variant={mode === "browser" ? "default" : "outline"}
							onClick={() => setMode("browser")}
							disabled={!dicomRemoteEnabled || dicomConfigLoading}
						>
							<Database className="mr-2 h-4 w-4" />
							{dicomConfigLoading
								? "Verificando PACS..."
								: dicomRemoteEnabled
									? "PACS remoto"
									: "PACS indisponível"}
						</Button>
						<Button
							variant={mode === "upload" ? "default" : "outline"}
							onClick={() => setMode("upload")}
						>
							<Upload className="mr-2 h-4 w-4" />
							Arquivo local
						</Button>
					</div>
				</div>

				<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
					<Card className="min-h-[620px]">
						<CardContent className="p-4">
							{mode === "browser" ? (
								<Suspense fallback={<LoadingFallback />}>
									<div className="h-[580px] overflow-hidden rounded-xl border bg-white">
										<DicomBrowser />
									</div>
								</Suspense>
							) : (
								<div className="space-y-4">
									<div
										{...getRootProps()}
										className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
											isDragActive
												? "border-primary bg-primary/5"
												: "border-slate-300 bg-slate-50"
										}`}
									>
										<input {...getInputProps()} />
										<FileUp className="mx-auto h-10 w-10 text-slate-500" />
										<h2 className="mt-4 text-lg font-semibold">
											Envie um arquivo DICOM
										</h2>
										<p className="mt-2 text-sm text-muted-foreground">
											Abra um `.dcm` local para validar estudos, testar compatibilidade
											de codec e conferir se o viewer suporta o exame sem passar pelo PACS.
										</p>
									</div>

									{file ? (
										<Suspense fallback={<LoadingFallback />}>
											<div className="overflow-hidden rounded-xl border bg-black">
												<DicomViewer file={file} />
											</div>
										</Suspense>
									) : (
										<div className="rounded-xl border bg-slate-50 p-6 text-sm text-muted-foreground">
											Nenhum arquivo selecionado ainda.
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					<div className="space-y-4">
						<Card>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between gap-3">
									<CardTitle className="flex items-center gap-2 text-base">
										<HardDriveDownload className="h-4 w-4" />
										Auditoria de codecs
									</CardTitle>
									<Button
										variant="ghost"
										size="sm"
										onClick={resetAudit}
										disabled={trackedSyntaxes.length === 0}
									>
										Limpar auditoria
									</Button>
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-sm text-muted-foreground">
									Esta máquina salva os `Transfer Syntax UID` vistos em estudos reais.
									Use essa leitura antes de remover `openjpeg` ou `openjph`.
								</p>
								<div className="flex flex-wrap gap-2">
									{trackedFamilies.length > 0 ? (
										trackedFamilies.map((family) => (
											<Badge key={family} variant="secondary">
												{family}
											</Badge>
										))
									) : (
										<Badge variant="outline">sem codecs especializados</Badge>
									)}
								</div>
								<div className="space-y-2">
									{codecSummaries.map((item) => (
										<div key={item.codec} className="rounded-lg border bg-slate-50 p-3">
											<div className="flex items-center justify-between gap-2">
												<div className="text-sm font-medium capitalize">{item.codec}</div>
												<Badge
													variant={item.status === "candidate" ? "outline" : "secondary"}
												>
													{item.status === "candidate" ? "candidato" : "manter"}
												</Badge>
											</div>
											<div className="mt-2 grid gap-1 text-xs text-muted-foreground">
												<div>Ocorrencias totais: {item.totalHits}</div>
												<div>Sintaxes vistas: {item.syntaxCount}</div>
												<div>
													Ultimo uso:{" "}
													{item.lastSeenAt
														? new Date(item.lastSeenAt).toLocaleString("pt-BR")
														: "nenhum registro"}
												</div>
											</div>
										</div>
									))}
								</div>
								<div className="space-y-2">
									{trackedSyntaxes.length > 0 ? (
										trackedSyntaxes.map((item) => (
											<div
												key={item.syntax}
												className="rounded-lg border bg-slate-50 p-3"
											>
												<div className="text-sm font-medium">{item.label}</div>
												<div className="mt-1 text-xs text-muted-foreground">
													{item.syntax}
												</div>
												<div className="mt-2 text-xs uppercase tracking-wide text-slate-600">
													Codec: {item.codec}
												</div>
												<div className="mt-1 text-xs text-muted-foreground">
													Ocorrencias: {item.count}
												</div>
												<div className="mt-1 text-xs text-muted-foreground">
													Ultimo uso:{" "}
													{new Date(item.lastSeenAt).toLocaleString("pt-BR")}
												</div>
											</div>
										))
									) : (
										<div className="rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
											Ainda não existem studies auditados neste navegador.
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<RefreshCw className="h-4 w-4" />
									Recomendacao de corte
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm text-muted-foreground">
								{codecRecommendations.map((item) => (
									<div key={item.codec} className="rounded-lg border bg-slate-50 p-3">
										<div className="flex items-center justify-between gap-2">
											<div className="font-medium text-slate-900">{item.codec}</div>
											<Badge
												variant={item.status === "candidate" ? "outline" : "secondary"}
											>
												{item.status === "candidate" ? "candidato" : "manter"}
											</Badge>
										</div>
										<p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>
									</div>
								))}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</MainLayout>
	);
}
