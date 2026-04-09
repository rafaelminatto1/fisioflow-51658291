export const getWorkersApiUrl = (): string => {
	const fallbackUrl = "https://fisioflow-api.rafalegollas.workers.dev";

	if (typeof window !== "undefined") {
		const hostname = window.location.hostname;
		if (hostname.includes("rafalegollas.workers.dev")) {
			return fallbackUrl;
		}
	}

	const envUrl = import.meta.env.VITE_WORKERS_API_URL;

	return (envUrl || fallbackUrl).replace(/\/$/, "");
};
