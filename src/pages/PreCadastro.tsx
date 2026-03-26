import React, { useEffect, useState } from "react";
import "@/styles/premium-utilities.css";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	ShieldCheck,
	ClipboardList,
	User,
	Info,
} from "lucide-react";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { precadastroApi, type PrecadastroToken } from "@/api/v2";
import { cn } from "@/lib/utils";

const PreCadastro = () => {
	const { token } = useParams<{ token: string }>();
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [tokenData, setTokenData] = useState<PrecadastroToken | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState(1);
	const [formData, setFormData] = useState({
		nome: "",
		email: "",
		telefone: "",
		data_nascimento: "",
		endereco: "",
		cpf: "",
		convenio: "",
		queixa_principal: "",
		historico_doencas: "",
		medicamentos: "",
		cirurgias: "",
		aceite_lgpd: false,
		observacoes: "",
	});

	useEffect(() => {
		const validateToken = async () => {
			if (!token) {
				setError("Link inválido");
				setLoading(false);
				return;
			}

			try {
				const res = await precadastroApi.public.getToken(token);
				setTokenData((res?.data ?? null) as PrecadastroToken | null);
			} catch (err) {
				logger.error("Error validating token", err, "PreCadastro");
				setError(err instanceof Error ? err.message : "Erro ao validar link");
			} finally {
				setLoading(false);
			}
		};

		void validateToken();
	}, [token]);

	

	

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!token || !tokenData) return;

		if (!formData.aceite_lgpd) {
			toast.error(
				"Você precisa aceitar os termos de privacidade para continuar.",
			);
			return;
		}

		const requiredFields = tokenData.campos_obrigatorios || ["nome", "email"];
		for (const field of requiredFields) {
			const value = formData[field as keyof typeof formData];
			if (!value && typeof value !== "boolean") {
				toast.error(`O campo ${field} é obrigatório`);
				return;
			}
		}

		setSubmitting(true);
		try {
			await precadastroApi.public.submit(token, formData);
			setSubmitted(true);
			toast.success("Admissão digital concluída!");
		} catch (err) {
			logger.error("Error submitting pre-registration", err, "PreCadastro");
			toast.error(err instanceof Error ? err.message : "Erro ao enviar dados");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-sm font-bold uppercase tracking-widest text-slate-400">
						Iniciando Admissão Digital...
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
				<Card className="max-w-md w-full p-8 text-center rounded-3xl border-none shadow-xl">
					<AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
					<h2 className="text-2xl font-black tracking-tighter">
						Link Expirado ou Inválido
					</h2>
					<p className="text-muted-foreground mt-2">
						Por favor, solicite um novo link de cadastro à clínica.
					</p>
				</Card>
			</div>
		);
	}

	if (submitted) {
		return (
			<div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-white p-10 text-center rounded-[2.5rem] shadow-premium-xl border border-emerald-100">
					<div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
						<CheckCircle2 className="h-10 w-10 text-emerald-600" />
					</div>
					<h2 className="text-3xl font-black tracking-tightest leading-none">
						Tudo pronto!
					</h2>
					<p className="text-slate-500 mt-4 font-medium">
						Seus dados foram recebidos com sucesso. Agora é só aguardar o seu
						horário agendado.
					</p>
					<div className="mt-8 pt-8 border-t border-slate-50">
						<p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
							FisioFlow Admissão Digital
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
			<div className="max-w-xl mx-auto space-y-8">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
						<ShieldCheck className="w-3 h-3" />
						Ambiente Seguro
					</div>
					<h1 className="text-4xl font-black tracking-tightest leading-none">
						{tokenData?.nome || "Admissão Digital"}
					</h1>
					<p className="text-slate-500 font-medium">
						{tokenData?.descricao ||
							"Preencha sua ficha clínica para agilizar seu atendimento."}
					</p>
				</div>

				{/* Stepper */}
				<div className="flex items-center justify-between px-2">
					<div
						className={cn(
							"flex flex-col items-center gap-2",
							step >= 1 ? "text-primary" : "text-slate-300",
						)}
					>
						<div
							className={cn(
								"w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all",
								step >= 1
									? "bg-primary text-white shadow-lg"
									: "bg-white text-slate-300 border border-slate-100",
							)}
						>
							1
						</div>
						<span className="text-[9px] font-black uppercase tracking-widest">
							Identidade
						</span>
					</div>
					<div className="h-px flex-1 bg-slate-200 mx-4 -mt-6" />
					<div
						className={cn(
							"flex flex-col items-center gap-2",
							step >= 2 ? "text-primary" : "text-slate-300",
						)}
					>
						<div
							className={cn(
								"w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all",
								step >= 2
									? "bg-primary text-white shadow-lg"
									: "bg-white text-slate-300 border border-slate-100",
							)}
						>
							2
						</div>
						<span className="text-[9px] font-black uppercase tracking-widest">
							Saúde
						</span>
					</div>
					<div className="h-px flex-1 bg-slate-200 mx-4 -mt-6" />
					<div
						className={cn(
							"flex flex-col items-center gap-2",
							step >= 3 ? "text-primary" : "text-slate-300",
						)}
					>
						<div
							className={cn(
								"w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all",
								step >= 3
									? "bg-primary text-white shadow-lg"
									: "bg-white text-slate-300 border border-slate-100",
							)}
						>
							3
						</div>
						<span className="text-[9px] font-black uppercase tracking-widest">
							Termos
						</span>
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium-lg border border-white/50 p-8 md:p-12">
					<form onSubmit={handleSubmit} className="space-y-8">
						{/* Step 1: Identidade */}
						{step === 1 && (
							<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
								<div className="flex items-center gap-3 mb-4">
									<User className="w-5 h-5 text-primary" />
									<h3 className="font-black text-xl tracking-tight">
										Dados Pessoais
									</h3>
								</div>

								<div className="space-y-4">
									<div className="space-y-2">
										<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
											Nome Completo
										</Label>
										<Input
											value={formData.nome}
											onChange={(e) =>
												setFormData({ ...formData, nome: e.target.value })
											}
											placeholder="Seu nome completo"
											className="rounded-2xl h-12 bg-slate-50 border-none font-bold"
										/>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
												WhatsApp
											</Label>
											<Input
												value={formData.telefone}
												onChange={(e) =>
													setFormData({ ...formData, telefone: e.target.value })
												}
												placeholder="(00) 00000-0000"
												className="rounded-2xl h-12 bg-slate-50 border-none font-bold"
											/>
										</div>
										<div className="space-y-2">
											<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
												Nascimento
											</Label>
											<Input
												type="date"
												value={formData.data_nascimento}
												onChange={(e) =>
													setFormData({
														...formData,
														data_nascimento: e.target.value,
													})
												}
												className="rounded-2xl h-12 bg-slate-50 border-none font-bold"
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
											CPF
										</Label>
										<Input
											value={formData.cpf}
											onChange={(e) =>
												setFormData({ ...formData, cpf: e.target.value })
											}
											placeholder="000.000.000-00"
											className="rounded-2xl h-12 bg-slate-50 border-none font-bold"
										/>
									</div>
								</div>

								<Button
									type="button"
									onClick={() => setStep(2)}
									className="w-full rounded-2xl h-14 bg-slate-900 text-white font-black uppercase tracking-widest"
								>
									Próximo Passo
								</Button>
							</div>
						)}

						{/* Step 2: Saúde / Anamnese */}
						{step === 2 && (
							<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
								<div className="flex items-center gap-3 mb-4">
									<ClipboardList className="w-5 h-5 text-primary" />
									<h3 className="font-black text-xl tracking-tight">
										Histórico de Saúde
									</h3>
								</div>

								<div className="space-y-4">
									<div className="space-y-2">
										<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
											Queixa Principal
										</Label>
										<Textarea
											value={formData.queixa_principal}
											onChange={(e) =>
												setFormData({
													...formData,
													queixa_principal: e.target.value,
												})
											}
											placeholder="O que te trouxe à fisioterapia hoje?"
											className="rounded-2xl bg-slate-50 border-none font-bold min-h-[80px]"
										/>
									</div>
									<div className="space-y-2">
										<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
											Faz uso de algum medicamento?
										</Label>
										<Input
											value={formData.medicamentos}
											onChange={(e) =>
												setFormData({
													...formData,
													medicamentos: e.target.value,
												})
											}
											placeholder="Cite os nomes ou 'Não'"
											className="rounded-2xl h-12 bg-slate-50 border-none font-bold"
										/>
									</div>
									<div className="space-y-2">
										<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
											Histórico de Doenças ou Cirurgias
										</Label>
										<Textarea
											value={formData.historico_doencas}
											onChange={(e) =>
												setFormData({
													...formData,
													historico_doencas: e.target.value,
												})
											}
											placeholder="Diabetes, hipertensão, cirurgias prévias..."
											className="rounded-2xl bg-slate-50 border-none font-bold min-h-[80px]"
										/>
									</div>
								</div>

								<div className="flex gap-3">
									<Button
										type="button"
										variant="ghost"
										onClick={() => setStep(1)}
										className="rounded-2xl h-14 font-black uppercase tracking-widest"
									>
										Voltar
									</Button>
									<Button
										type="button"
										onClick={() => setStep(3)}
										className="flex-1 rounded-2xl h-14 bg-slate-900 text-white font-black uppercase tracking-widest"
									>
										Quase lá...
									</Button>
								</div>
							</div>
						)}

						{/* Step 3: LGPD & Submit */}
						{step === 3 && (
							<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
								<div className="flex items-center gap-3 mb-4">
									<ShieldCheck className="w-5 h-5 text-primary" />
									<h3 className="font-black text-xl tracking-tight">
										Privacidade e Termos
									</h3>
								</div>

								<div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4">
									<div className="flex items-start gap-3">
										<Info className="w-4 h-4 text-primary mt-1 shrink-0" />
										<p className="text-[11px] leading-relaxed text-slate-600 font-medium text-justify">
											Seus dados serão utilizados exclusivamente para fins de
											atendimento clínico e administrativo, em conformidade com
											a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.
											Garantimos o sigilo médico e a segurança das suas
											informações em nossos servidores criptografados.
										</p>
									</div>
									<div className="flex items-center space-x-3 p-4 bg-white rounded-2xl shadow-sm">
										<Checkbox
											id="lgpd"
											checked={formData.aceite_lgpd}
											onCheckedChange={(checked) =>
												setFormData({ ...formData, aceite_lgpd: !!checked })
											}
											className="w-5 h-5 rounded-lg border-2"
										/>
										<label
											htmlFor="lgpd"
											className="text-xs font-black uppercase tracking-tight leading-none cursor-pointer"
										>
											Eu aceito os termos de tratamento de dados
										</label>
									</div>
								</div>

								<div className="flex gap-3">
									<Button
										type="button"
										variant="ghost"
										onClick={() => setStep(2)}
										className="rounded-2xl h-14 font-black uppercase tracking-widest"
									>
										Voltar
									</Button>
									<Button
										type="submit"
										disabled={submitting || !formData.aceite_lgpd}
										className="flex-1 rounded-2xl h-14 bg-primary text-white shadow-premium-lg font-black uppercase tracking-widest gap-2"
									>
										{submitting ? (
											<Loader2 className="animate-spin" />
										) : (
											<CheckCircle2 className="w-5 h-5" />
										)}
										Finalizar Admissão
									</Button>
								</div>
							</div>
						)}
					</form>
				</div>

				<p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
					Powered by FisioFlow Intelligence
				</p>
			</div>
		</div>
	);
};

export default PreCadastro;
