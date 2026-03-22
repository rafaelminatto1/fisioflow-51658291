/**
 * Hooks TanStack Query para Protocolos via Cloudflare Workers API
 */
import { useQuery } from "@tanstack/react-query";
import { protocolsApi } from "@/api/v2";

const KEYS = {
	list: (params?: object) => ["workers", "protocols", "list", params] as const,
	detail: (id: string) => ["workers", "protocols", id] as const,
};

export function useWorkerProtocols(params?: {
	q?: string;
	type?: string;
	evidenceLevel?: string;
	page?: number;
	limit?: number;
}) {
	return useQuery({
		queryKey: KEYS.list(params),
		queryFn: () => protocolsApi.list(params),
		staleTime: 1000 * 60 * 10,
		select: (res) => res,
	});
}

export function useWorkerProtocol(id: string) {
	return useQuery({
		queryKey: KEYS.detail(id),
		queryFn: () => protocolsApi.get(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 15,
		select: (res) => res.data,
	});
}
