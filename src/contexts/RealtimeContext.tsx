import { createContext, useState, useCallback, useEffect, useRef } from "react";
import { appointmentsApi } from "@/api/v2";
import { useAuth } from "@/contexts/AuthContext";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useDebounce } from "@/hooks/performance/useDebounce";
import { getWorkersApiUrl } from "@/lib/api/config";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { useQueryClient } from "@tanstack/react-query";

let _loggedRealtimeNoOrgId = false;

export interface DashboardMetrics {
	totalAppointments: number;
	confirmedAppointments: number;
	cancelledAppointments: number;
	patientsInSession: number;
	todayRevenue: number;
	occupancyRate: number;
}

export interface Appointment {
	id: string;
	patient_name: string;
	therapist_id: string;
	start_time: string;
	end_time?: string;
	status: "confirmed" | "pending" | "cancelled";
	type?: string;
}

interface RealtimeContextType {
	appointments: Appointment[];
	onlineUsers: Map<string, any>;
	metrics: DashboardMetrics;
	lastUpdate: number;
	isSubscribed: boolean;
	subscribeToAppointments: () => void;
	updateMetrics: () => Promise<void>;
}

// Criar o contexto (exportado para useRealtimeContext)
export const RealtimeContext = createContext<RealtimeContextType | null>(null);
RealtimeContext.displayName = "RealtimeContext";

/**
 * Provider central para gerenciar todas as subscrições realtime em um único lugar
 * Elimina a duplicação de subscriptions em múltiplos componentes
 * Otimizado para evitar memory leaks com cleanup adequado
 *
 * OTIMIZAÇÕES IMPLEMENTADAS:
 * 1. Batch updates para múltiplas mudanças rápidas
 * 2. Debounce inteligente para evitar recálculos excessivos
 * 3. Filtragem por data (só appointments futuros/recentes em memória)
 * 4. Métricas calculadas em memória (sem queries adicionais)
 * 5. Cleanup adequado de channels
 */
export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { profile } = useAuth();
	const queryClient = useQueryClient();
	const organizationId = profile?.organization_id;
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [onlineUsers, setOnlineUsers] = useState<Map<string, any>>(new Map());
	const [metrics, setMetrics] = useState<DashboardMetrics>({
		totalAppointments: 0,
		confirmedAppointments: 0,
		cancelledAppointments: 0,
		patientsInSession: 0,
		todayRevenue: 0,
		occupancyRate: 0,
	});
	const [lastUpdate, setLastUpdate] = useState(Date.now());
	const [isSubscribed, setIsSubscribed] = useState(false);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);

	/**
	 * Atualizar métricas baseadas nos appointments atuais
	 * Usa memoização interna para evitar recálculos desnecessários
	 */
	const updateMetrics = useCallback(async () => {
		// Early return se não houver appointments
		if (appointments.length === 0) {
			setMetrics({
				totalAppointments: 0,
				confirmedAppointments: 0,
				cancelledAppointments: 0,
				patientsInSession: 0,
				todayRevenue: 0,
				occupancyRate: 0,
			});
			return;
		}

		try {
			// Calcular métricas em uma única passagem (O(n) em vez de O(n*5))
			let confirmed = 0;
			let cancelled = 0;
			let revenue = 0;
			const todayStart = new Date();
			todayStart.setHours(0, 0, 0, 0);
			const patientSet = new Set<string>();

			for (const a of appointments) {
				if (a.status === "confirmed") {
					confirmed++;
					patientSet.add(a.patient_name);

					const apptDate = new Date(a.start_time);
					if (apptDate >= todayStart && a.type === "paid") {
						revenue += 100;
					}
				} else if (a.status === "cancelled") {
					cancelled++;
				}
			}

			const total = appointments.length;
			const occupancyRate =
				total > 0 ? Math.round((confirmed / total) * 100) : 0;

			setMetrics({
				totalAppointments: total,
				confirmedAppointments: confirmed,
				cancelledAppointments: cancelled,
				patientsInSession: patientSet.size,
				todayRevenue: revenue,
				occupancyRate,
			});
		} catch (error) {
			logger.error(
				"Realtime: Error in updateMetrics",
				error,
				"RealtimeContext",
			);
		}
	}, [appointments]);

	// Debounced appointments para evitar recálculos em mudanças rápidas
	const debouncedAppointments = useDebounce(appointments, 300);

	// Atualizar métricas quando appointments debounced mudar
	useEffect(() => {
		updateMetrics();
	}, [updateMetrics, debouncedAppointments]);

	/**
	 * Carregar appointments iniciais ao montar o provider
	 * OTIMIZADO: Só carrega appointments futuros e dos últimos 7 dias
	 */
	const loadInitialAppointments = useCallback(async () => {
		if (!organizationId) return;

		try {
			logger.debug(
				"Realtime: Loading initial appointments via Functions",
				{},
				"RealtimeContext",
			);

			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
			const dateFrom = sevenDaysAgo.toISOString().split("T")[0];

			const response = await appointmentsApi.list({
				dateFrom,
				limit: 100,
			});

			if (response.data) {
				setAppointments(response.data as unknown as Appointment[]);
				setLastUpdate(Date.now());
				logger.debug(
					`Realtime: Loaded ${response.data.length} initial appointments`,
					{},
					"RealtimeContext",
				);
			}
		} catch (error) {
			logger.error(
				"Realtime: Error in loadInitialAppointments",
				error,
				"RealtimeContext",
			);
		}
	}, [organizationId]);

	/**
	 * Configura e gerencia a conexão WebSocket
	 */
	const connectWebSocket = useCallback(async () => {
		if (!organizationId) return;

		try {
			if (wsRef.current?.readyState === WebSocket.OPEN) return;

			const token = await getNeonAccessToken();
			const baseUrl = getWorkersApiUrl().replace(/^http/, "ws");
			const wsUrl = `${baseUrl}/api/realtime?token=${token}`;

			logger.info(
				"Realtime: Connecting to WebSocket...",
				{ organizationId },
				"RealtimeContext",
			);

			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				logger.info(
					"Realtime: WebSocket Connected",
					{ organizationId },
					"RealtimeContext",
				);
				setIsSubscribed(true);
				if (reconnectTimeoutRef.current) {
					window.clearTimeout(reconnectTimeoutRef.current);
					reconnectTimeoutRef.current = null;
				}

				// Broadcast presence
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(
						JSON.stringify({
							type: "PRESENCE_UPDATE",
							payload: {
								userId: profile?.uid,
								name: profile?.full_name || "Profissional",
								role: profile?.role,
								status: "online",
							},
						}),
					);
				}

				loadInitialAppointments();
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					logger.debug("Realtime: Message received", data, "RealtimeContext");

					if (
						data.type === "APPOINTMENT_UPDATED" ||
						data.type === "REFRESH_DATA"
					) {
						loadInitialAppointments();
						// Invalida via React Query (moderno)
						queryClient.invalidateQueries({ queryKey: ["appointments_v2"] });
					} else if (data.type === "NOTIFICATION_RECEIVED") {
						queryClient.invalidateQueries({ queryKey: ["notifications"] });
					} else if (data.type === "PRESENCE_UPDATE") {
						setOnlineUsers((prev) => {
							const next = new Map(prev);
							if (data.payload.status === "offline") {
								next.delete(data.payload.userId);
							} else {
								next.set(data.payload.userId, data.payload);
							}
							return next;
						});
					}
				} catch (e) {
					// Heartbeat or other non-json messages
					if (event.data === "pong") return;
					logger.error("Realtime: Error parsing message", e, "RealtimeContext");
				}
			};

			ws.onclose = (event) => {
				setIsSubscribed(false);
				wsRef.current = null;
				logger.warn(
					"Realtime: WebSocket Closed",
					{ code: event.code },
					"RealtimeContext",
				);

				if (event.code !== 1000) {
					reconnectTimeoutRef.current = window.setTimeout(() => {
						connectWebSocket();
					}, 5000);
				}
			};

			ws.onerror = (error) => {
				logger.error("Realtime: WebSocket Error", error, "RealtimeContext");
				ws.close();
			};

			// Heartbeat
			const heartbeat = setInterval(() => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send("ping");
				} else {
					clearInterval(heartbeat);
				}
			}, 30000);
		} catch (error) {
			logger.error(
				"Realtime: Failed to connect WebSocket",
				error,
				"RealtimeContext",
			);
			reconnectTimeoutRef.current = window.setTimeout(() => {
				connectWebSocket();
			}, 10000);
		}
	}, [organizationId, loadInitialAppointments]);

	/**
	 * Substitui o antigo polling pela conexão WebSocket
	 */
	const subscribeToAppointments = useCallback(() => {
		if (!organizationId) {
			if (!_loggedRealtimeNoOrgId) {
				_loggedRealtimeNoOrgId = true;
				logger.debug(
					"Realtime: No organization_id, skipping subscription",
					{},
					"RealtimeContext",
				);
			}
			return () => {};
		}

		connectWebSocket();

		return () => {
			logger.debug(
				"Realtime: Stopping Realtime connection",
				{ organizationId },
				"RealtimeContext",
			);
			if (wsRef.current) {
				wsRef.current.close(1000, "Provider unmounting");
				wsRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				window.clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
		};
	}, [organizationId, connectWebSocket]);

	/**
	 * Carregar appointments iniciais ao montar o provider
	 * OTIMIZADO: Só carrega appointments futuros e dos últimos 7 dias
	 */
	useEffect(() => {
		loadInitialAppointments();
	}, [loadInitialAppointments]);

	/**
	 * Setup realtime subscription quando o componente monta
	 * Cleanup automático quando desmonta para evitar memory leaks
	 */
	useEffect(() => {
		const unsubscribe = subscribeToAppointments();
		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, [subscribeToAppointments]);

	const value: RealtimeContextType = {
		appointments,
		onlineUsers,
		metrics,
		lastUpdate,
		isSubscribed,
		subscribeToAppointments,
		updateMetrics,
	};

	return (
		<RealtimeContext.Provider value={value}>
			{children}
		</RealtimeContext.Provider>
	);
};
