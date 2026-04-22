import { useState } from "react";

interface ReviewResult {
	score: number;
	insights: string[];
	missingTests: string[];
	suggestedExercises: string[];
}

interface UsePeerReviewReturn {
	loading: boolean;
	reviewResult: ReviewResult | null;
	error: string | null;
	reviewSoap: (data: Record<string, string>) => Promise<void>;
	clearReview: () => void;
}

export function usePeerReview(): UsePeerReviewReturn {
	const [loading, setLoading] = useState(false);
	const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const reviewSoap = async (data: Record<string, string>) => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/ai/peer-review", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				setError("Falha ao obter revisão peer.");
				return;
			}
			const json = (await res.json()) as {
				success: boolean;
				data: ReviewResult;
			};
			setReviewResult(json.data);
		} catch {
			setError("Falha ao obter revisão peer.");
		} finally {
			setLoading(false);
		}
	};

	const clearReview = () => {
		setReviewResult(null);
	};

	return { loading, reviewResult, error, reviewSoap, clearReview };
}
