/**
 * Página pública de resposta NPS — sem autenticação.
 * URL: /nps/:token (token vem do nps_surveys.token gerado pelo backend).
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, AlertCircle, Heart } from "lucide-react";
import { npsApi } from "@/api/v2/nps";

type Status =
	| "loading"
	| "ready"
	| "already"
	| "expired"
	| "submitting"
	| "submitted"
	| "error";

function ScoreButton({
	value,
	selected,
	onSelect,
}: {
	value: number;
	selected: boolean;
	onSelect: (n: number) => void;
}) {
	const tone =
		value <= 6
			? "bg-rose-500 hover:bg-rose-600"
			: value <= 8
				? "bg-amber-500 hover:bg-amber-600"
				: "bg-emerald-500 hover:bg-emerald-600";
	return (
		<button
			type="button"
			onClick={() => onSelect(value)}
			className={`h-12 w-12 rounded-lg text-white font-bold tabular-nums transition-all ${
				selected
					? `${tone} ring-2 ring-offset-2 ring-slate-900 scale-110`
					: `${tone} opacity-70 hover:opacity-100`
			}`}
		>
			{value}
		</button>
	);
}

export default function NpsPublic() {
	const { token } = useParams<{ token: string }>();
	const [status, setStatus] = useState<Status>("loading");
	const [contactName, setContactName] = useState<string>("");
	const [score, setScore] = useState<number | null>(null);
	const [comentario, setComentario] = useState<string>("");
	const [errorMsg, setErrorMsg] = useState<string>("");

	useEffect(() => {
		if (!token) {
			setStatus("error");
			setErrorMsg("Link inválido.");
			return;
		}
		npsApi
			.publicGet(token)
			.then((res) => {
				setContactName(res.data.contact_name);
				setStatus(res.data.already_answered ? "already" : "ready");
			})
			.catch((err: Error & { status?: number }) => {
				if (err.status === 410) setStatus("expired");
				else {
					setErrorMsg(err.message || "Não foi possível carregar a pesquisa.");
					setStatus("error");
				}
			});
	}, [token]);

	const handleSubmit = async () => {
		if (!token || score == null) return;
		setStatus("submitting");
		try {
			await npsApi.publicRespond(token, score, comentario.trim() || undefined);
			setStatus("submitted");
		} catch (err) {
			setErrorMsg(
				(err as Error).message || "Não foi possível registrar sua resposta.",
			);
			setStatus("error");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50 p-4">
			<div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-xl p-8 space-y-6">
				<div className="flex items-center gap-2 text-emerald-600">
					<Heart className="h-5 w-5 fill-emerald-500" />
					<span className="text-sm font-medium uppercase tracking-wider">
						Pesquisa NPS
					</span>
				</div>

				{status === "loading" && (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin" /> Carregando…
					</div>
				)}

				{status === "ready" && (
					<>
						<div className="space-y-2">
							<h1 className="text-2xl font-bold">
								Olá{contactName ? `, ${contactName.split(" ")[0]}` : ""}!
							</h1>
							<p className="text-slate-600">
								Em uma escala de <strong>0 a 10</strong>, o quanto você
								indicaria a nossa clínica para um amigo ou familiar?
							</p>
						</div>

						<div className="grid grid-cols-11 gap-2">
							{Array.from({ length: 11 }, (_, i) => (
								<ScoreButton
									key={i}
									value={i}
									selected={score === i}
									onSelect={setScore}
								/>
							))}
						</div>
						<div className="flex justify-between text-xs text-muted-foreground -mt-2">
							<span>Pouco provável</span>
							<span>Muito provável</span>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-700">
								Quer deixar um comentário?{" "}
								<span className="text-muted-foreground">(opcional)</span>
							</label>
							<Textarea
								value={comentario}
								onChange={(e) => setComentario(e.target.value)}
								placeholder="O que motivou sua nota?"
								maxLength={2000}
								rows={4}
							/>
						</div>

						<Button
							onClick={handleSubmit}
							disabled={score == null}
							className="w-full h-12 text-base"
						>
							Enviar resposta
						</Button>
					</>
				)}

				{status === "submitting" && (
					<div className="flex items-center gap-2 text-muted-foreground py-4">
						<Loader2 className="h-5 w-5 animate-spin" /> Enviando…
					</div>
				)}

				{status === "submitted" && (
					<div className="text-center space-y-3 py-4">
						<CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
						<h2 className="text-xl font-bold">Obrigado pela sua resposta!</h2>
						<p className="text-slate-600">
							{score != null && score >= 9
								? "Adoramos saber disso. Sua avaliação faz toda a diferença!"
								: score != null && score >= 7
									? "Vamos continuar trabalhando para melhorar sua experiência."
									: "Sentimos muito. Nossa equipe vai entrar em contato para entender melhor."}
						</p>
					</div>
				)}

				{status === "already" && (
					<div className="text-center space-y-3 py-4">
						<CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
						<h2 className="text-lg font-bold">
							Você já respondeu esta pesquisa
						</h2>
						<p className="text-slate-600">Obrigado pelo seu tempo!</p>
					</div>
				)}

				{status === "expired" && (
					<div className="text-center space-y-3 py-4">
						<AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
						<h2 className="text-lg font-bold">Pesquisa expirada</h2>
						<p className="text-slate-600">
							O prazo para responder esta pesquisa terminou. Obrigado pelo
							interesse.
						</p>
					</div>
				)}

				{status === "error" && (
					<div className="text-center space-y-3 py-4">
						<AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
						<h2 className="text-lg font-bold">Algo deu errado</h2>
						<p className="text-slate-600">{errorMsg}</p>
					</div>
				)}
			</div>
		</div>
	);
}
