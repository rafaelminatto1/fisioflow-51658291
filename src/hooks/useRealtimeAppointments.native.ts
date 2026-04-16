/**
 * Versão Native do Hook de Sincronização
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { appointmentsApi } from "@/api/v2";
import { fisioLogger as logger } from "@/lib/errors/logger";

export const useRealtimeAppointments = () => {
	const { user } = useAuth();
	const queryClient = useQueryClient();
	const lastTimestampRef = useRef<string | null>(null);

	useEffect(() => {
		if (!user) return;

		let active = true;

		const poll = async () => {
			try {
				const res = await appointmentsApi.lastUpdated();
				if (!active) return;
				const next = res?.data?.last_updated_at ?? null;
				if (next && next !== lastTimestampRef.current) {
					lastTimestampRef.current = next;
					import("@/utils/cacheInvalidation").then(({ invalidateAppointmentsComprehensive }) => {
						invalidateAppointmentsComprehensive(queryClient);
					});
					logger.info(
						"[Realtime Native] Agenda synced",
						{ timestamp: next },
						"useRealtimeAppointments.native",
					);
				}
			} catch (error) {
				logger.debug(
					"Erro restrito ao polling mobile",
					error,
					"useRealtimeAppointments.native",
				);
			}
		};

		void poll();
		const interval = setInterval(() => void poll(), 15000);
		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [user, queryClient]);
};
