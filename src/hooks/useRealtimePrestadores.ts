/**
 * Hook to keep prestadores data fresh by polling the Worker metrics endpoint.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prestadoresApi } from "@/lib/api/workers-client";
import { fisioLogger as logger } from "@/lib/errors/logger";

export function useRealtimePrestadores(eventoId: string) {
	const queryClient = useQueryClient();
	const lastUpdatedRef = useRef<string | null>(null);

	useEffect(() => {
		if (!eventoId) return;

		let active = true;
		const pollMetrics = async () => {
			try {
				const res = await prestadoresApi.metrics(eventoId);
				if (!active) return;
				const nextUpdated = res?.data?.last_updated_at ?? null;
				if (!nextUpdated) return;
				if (nextUpdated !== lastUpdatedRef.current) {
					lastUpdatedRef.current = nextUpdated;
					queryClient.invalidateQueries({
						queryKey: ["prestadores", eventoId],
					});
					queryClient.invalidateQueries({ queryKey: ["eventos-stats"] });
				}
			} catch (error) {
				logger.error(
					"Error polling prestadores metrics",
					error as Error,
					"useRealtimePrestadores",
				);
			}
		};

		pollMetrics();
		const interval = setInterval(pollMetrics, 15000);
		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [eventoId, queryClient]);
}
