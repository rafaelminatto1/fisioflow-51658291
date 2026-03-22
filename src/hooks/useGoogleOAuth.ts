import { useState, useCallback } from "react";
import { toast } from "sonner";
import { integrationsApi } from "@/api/v2";

function buildLocalGoogleAuthUrl(state?: string): string {
	const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
	const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
	if (!clientId || !redirectUri) {
		throw new Error("Google OAuth não configurado");
	}
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: [
			"https://www.googleapis.com/auth/calendar",
			"https://www.googleapis.com/auth/calendar.events",
		].join(" "),
		access_type: "offline",
		prompt: "consent",
		state: state || "google-integrations",
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function useGoogleOAuth() {
	const [loading, setLoading] = useState(false);

	const connect = useCallback(async () => {
		setLoading(true);
		try {
			let url: string | undefined;
			try {
				const result = await integrationsApi.google.authUrl(
					"google-integrations",
				);
				url = result.data?.url;
			} catch {
				url = buildLocalGoogleAuthUrl("google-integrations");
			}

			if (!url) {
				throw new Error("URL de autenticação não disponível");
			}

			window.location.href = url;
		} catch (error) {
			console.error("Error connecting to Google:", error);
			toast.error("Erro ao conectar com Google");
		} finally {
			setLoading(false);
		}
	}, []);

	return {
		connect,
		loading,
	};
}
