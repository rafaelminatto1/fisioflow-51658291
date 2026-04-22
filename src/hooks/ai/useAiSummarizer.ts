import { useState } from "react";

interface UseAiSummarizerReturn {
	loading: boolean;
	summary: string | null;
	error: string | null;
	summarizePatient: (data: Record<string, unknown>) => Promise<void>;
}

export function useAiSummarizer(): UseAiSummarizerReturn {
	const [loading, setLoading] = useState(false);
	const [summary, setSummary] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const summarizePatient = async (data: Record<string, unknown>) => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/ai/summarize-patient", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				setError("Falha ao gerar resumo na borda (Edge AI).");
				return;
			}
			const json = (await res.json()) as {
				success: boolean;
				data: { summary: string };
			};
			setSummary(json.data.summary);
		} catch {
			setError("Falha ao gerar resumo na borda (Edge AI).");
		} finally {
			setLoading(false);
		}
	};

	return { loading, summary, error, summarizePatient };
}
