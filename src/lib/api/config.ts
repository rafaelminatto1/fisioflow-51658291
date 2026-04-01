/**
 * Configuração centralizada de URLs de API para garantir consistência entre ambientes.
 * Resolve problemas onde o build local vaza URLs de localhost para a produção.
 */

export const getWorkersApiUrl = (): string => {
	const fallbackUrl = "https://fisioflow-api.rafalegollas.workers.dev";
	
	// 1. Se estivermos no navegador, verificamos a URL atual
	if (typeof window !== "undefined") {
		const hostname = window.location.hostname;
		
		// Se estivermos rodando no workers.dev, preferimos usar a API no mesmo ambiente
		if (hostname.includes("rafalegollas.workers.dev")) {
			return fallbackUrl;
		}
	}

	// 2. Obtemos a URL da variável de ambiente
	const envUrl = import.meta.env.VITE_WORKERS_API_URL;

	// 3. Se a URL de ambiente for o domínio customizado que sabemos estar com problemas de DNS, 
	// usamos o fallback garantido da Cloudflare.
	if (envUrl && envUrl.includes("api-pro.moocafisio.com.br")) {
		return fallbackUrl;
	}

	return (envUrl || fallbackUrl).replace(/\/$/, "");
};
