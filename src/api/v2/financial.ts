import { request } from "./base";
import type {
	Transacao,
	ContaFinanceira,
	CentroCusto,
	Convenio,
	Pagamento,
	EmpresaParceira,
	Fornecedor,
	FormaPagamento,
	SessionPackageTemplateRow,
	VoucherRecord,
	NFSeRecord,
	NFSeConfigRecord,
	Recibo,
	RecibosLastNumber,
} from "@/types/workers";

const fin = (path: string, opts?: RequestInit) =>
	request<any>(`/api/financial${path}`, opts);

export type FinancialCommandCenterPeriod =
	| "daily"
	| "weekly"
	| "monthly"
	| "all";

export interface FinancialCommandCenterSummary {
	realizedRevenue: number;
	realizedExpenses: number;
	netBalance: number;
	pendingReceivables: number;
	pendingPayables: number;
	overdueAmount: number;
	averageTicket: number;
	collectionRate: number;
	monthlyGrowth: number;
	activePatients: number;
	projectedNext30Days: number;
}

export interface FinancialCommandCenterCashflowPoint {
	date: string;
	label: string;
	income: number;
	expense: number;
	balance: number;
}

export interface FinancialCommandCenterAccountSpotlight {
	id: string;
	tipo: string;
	description: string;
	status: string;
	amount: number;
	dueDate: string;
	patientId: string | null;
	patientName: string;
}

export interface FinancialCommandCenterRiskPatient {
	id: string;
	fullName: string;
	phone: string;
	lastAppointment: string | null;
	openAmount: number;
	missedCount: number;
}

export interface FinancialCommandCenterAlert {
	id: string;
	title: string;
	description: string;
	tone: "critical" | "warning" | "info";
	href: string;
}

export interface FinancialCommandCenterSuggestion {
	id: string;
	title: string;
	description: string;
	href: string;
}

export interface FinancialCommandCenterData {
	period: {
		key: FinancialCommandCenterPeriod;
		label: string;
		startDate: string;
		endDate: string;
		previousStartDate: string;
		previousEndDate: string;
	};
	summary: FinancialCommandCenterSummary;
	cashflow: {
		points: FinancialCommandCenterCashflowPoint[];
		totals: {
			income: number;
			expense: number;
			balance: number;
		};
	};
	collections: {
		overdueCount: number;
		dueTodayCount: number;
		topAccounts: FinancialCommandCenterAccountSpotlight[];
	};
	documents: {
		receiptsInPeriod: number;
		lastReceiptNumber: number;
		pendingNfse: number;
		authorizedNfse: number;
		failedNfse: number;
	};
	integrations: {
		patients: {
			activeCount: number;
			newPatients: number;
			convertedPatients: number;
			riskPatients: FinancialCommandCenterRiskPatient[];
		};
		crm: {
			totalLeads: number;
			pipelineLeads: number;
			hotLeads: number;
			openTasks: number;
			overdueTasks: number;
			topStage: {
				name: string;
				total: number;
			};
			campaignsInPeriod: number;
		};
		marketing: {
			recallActive: number;
			referralRedemptions: number;
			convertedLeads: number;
			newPatientsInPeriod: number;
		};
		schedule: {
			completedSessions: number;
			scheduledNext7Days: number;
			scheduledNext30Days: number;
			expectedRevenueNext30Days: number;
			noShowRate90d: number;
		};
	};
	recentTransactions: Array<{
		id: string;
		tipo: string;
		description: string;
		status: string;
		amount: number;
		createdAt: string;
	}>;
	alerts: FinancialCommandCenterAlert[];
	suggestions: FinancialCommandCenterSuggestion[];
}

export interface PatientPackageRow {
	id: string;
	patient_id: string;
	package_template_id?: string | null;
	name: string;
	total_sessions: number | string;
	used_sessions: number | string;
	remaining_sessions?: number | string | null;
	price?: number | string | null;
	payment_method?: string | null;
	purchased_at?: string | null;
	expires_at?: string | null;
	last_used_at?: string | null;
	created_at: string;
	patient_name?: string | null;
	patient_phone?: string | null;
	organization_id?: string;
}

export const financialApi = {
	commandCenter: {
		get: (period: FinancialCommandCenterPeriod = "monthly") =>
			fin(`/command-center?period=${encodeURIComponent(period)}`) as Promise<{
				data: FinancialCommandCenterData;
			}>,
	},
	transacoes: {
		list: (p?: {
			tipo?: string;
			status?: string;
			dateFrom?: string;
			dateTo?: string;
			limit?: number;
			offset?: number;
		}) =>
			fin(
				`/transacoes?${new URLSearchParams(
					Object.fromEntries(
						Object.entries(p ?? {})
							.filter(([, v]) => v != null)
							.map(([k, v]) => [k, String(v)]),
					),
				)}`,
			),
		create: (d: Partial<Transacao>) =>
			fin("/transacoes", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<Transacao>) =>
			fin(`/transacoes/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => fin(`/transacoes/${id}`, { method: "DELETE" }),
	},
	contas: {
		list: (p?: {
			tipo?: string;
			status?: string;
			dateFrom?: string;
			dateTo?: string;
			limit?: number;
			offset?: number;
		}) =>
			fin(
				`/contas?${new URLSearchParams(
					Object.fromEntries(
						Object.entries(p ?? {})
							.filter(([, v]) => v != null)
							.map(([k, v]) => [k, String(v)]),
					),
				)}`,
			),
		create: (d: Partial<ContaFinanceira>) =>
			fin("/contas", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<ContaFinanceira>) =>
			fin(`/contas/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => fin(`/contas/${id}`, { method: "DELETE" }),
	},
	centrosCusto: {
		list: () => fin("/centros-custo"),
		create: (d: Partial<CentroCusto>) =>
			fin("/centros-custo", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<CentroCusto>) =>
			fin(`/centros-custo/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => fin(`/centros-custo/${id}`, { method: "DELETE" }),
	},
	convenios: {
		list: () => fin("/convenios"),
		create: (d: Partial<Convenio>) =>
			fin("/convenios", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<Convenio>) =>
			fin(`/convenios/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => fin(`/convenios/${id}`, { method: "DELETE" }),
	},
	pagamentos: {
		list: (
			p?:
				| string
				| {
						eventoId?: string;
						patientId?: string;
						appointmentId?: string;
						dateFrom?: string;
						dateTo?: string;
						limit?: number;
						offset?: number;
				  },
		) => {
			const params = typeof p === "string" ? { eventoId: p } : (p ?? {});
			const query = new URLSearchParams(
				Object.fromEntries(
					Object.entries(params)
						.filter(([, v]) => v != null)
						.map(([k, v]) => [k, String(v)]),
				),
			);
			return fin(
				`/pagamentos${query.toString() ? `?${query.toString()}` : ""}`,
			);
		},
		create: (d: Partial<Pagamento>) =>
			fin("/pagamentos", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<Pagamento>) =>
			fin(`/pagamentos/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => fin(`/pagamentos/${id}`, { method: "DELETE" }),
	},
	empresasParceiras: {
		list: () => fin("/empresas-parceiras"),
		create: (d: Partial<EmpresaParceira>) =>
			fin("/empresas-parceiras", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<EmpresaParceira>) =>
			fin(`/empresas-parceiras/${id}`, {
				method: "PUT",
				body: JSON.stringify(d),
			}),
		delete: (id: string) =>
			fin(`/empresas-parceiras/${id}`, { method: "DELETE" }),
	},
	fornecedores: {
		list: () => fin("/fornecedores"),
		create: (d: Partial<Fornecedor>) =>
			fin("/fornecedores", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<Fornecedor>) =>
			fin(`/fornecedores/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => fin(`/fornecedores/${id}`, { method: "DELETE" }),
	},
	formasPagamento: {
		list: () => fin("/formas-pagamento"),
		create: (d: Partial<FormaPagamento>) =>
			fin("/formas-pagamento", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<FormaPagamento>) =>
			fin(`/formas-pagamento/${id}`, {
				method: "PUT",
				body: JSON.stringify(d),
			}),
		delete: (id: string) =>
			fin(`/formas-pagamento/${id}`, { method: "DELETE" }),
	},
	patientPackages: {
		list: (params?: {
			patientId?: string;
			status?: string;
			limit?: number;
			offset?: number;
		}) => {
			const query = new URLSearchParams(
				Object.fromEntries(
					Object.entries(params ?? {})
						.filter(([, v]) => v != null)
						.map(([k, v]) => [k, String(v)]),
				),
			);
			return fin(
				`/patient-packages${query.toString() ? `?${query.toString()}` : ""}`,
			);
		},
		create: (data: {
			patient_id: string;
			package_id?: string;
			name?: string;
			custom_sessions?: number;
			custom_price?: number;
			payment_method?: string;
			validity_days?: number;
		}) =>
			fin("/patient-packages", { method: "POST", body: JSON.stringify(data) }),
		consume: (id: string, data?: { appointmentId?: string }) =>
			fin(`/patient-packages/${id}/consume`, {
				method: "POST",
				body: JSON.stringify(data ?? {}),
			}),
	},
	packageTemplates: {
		list: () => fin("/package-templates"),
		create: (d: Partial<SessionPackageTemplateRow>) =>
			fin("/package-templates", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<SessionPackageTemplateRow>) =>
			fin(`/package-templates/${id}`, {
				method: "PUT",
				body: JSON.stringify(d),
			}),
		delete: (id: string) =>
			fin(`/package-templates/${id}`, { method: "DELETE" }),
	},
	vouchers: {
		list: (params?: { all?: boolean; ativo?: boolean }) => {
			const query = new URLSearchParams(
				Object.fromEntries(
					Object.entries(params ?? {})
						.filter(([, v]) => v != null)
						.map(([k, v]) => [k, String(v)]),
				),
			);
			return fin(`/vouchers${query.toString() ? `?${query.toString()}` : ""}`);
		},
		create: (data: Partial<VoucherRecord>) =>
			fin("/vouchers", { method: "POST", body: JSON.stringify(data) }),
		update: (id: string, data: Partial<VoucherRecord>) =>
			fin(`/vouchers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
		delete: (id: string) => fin(`/vouchers/${id}`, { method: "DELETE" }),
		checkout: (id: string) =>
			fin(`/vouchers/${id}/checkout`, { method: "POST" }),
		verifyCheckout: (sessionId: string) =>
			fin("/vouchers/checkout/verify", {
				method: "POST",
				body: JSON.stringify({ sessionId }),
			}),
	},
	userVouchers: {
		list: () => fin("/user-vouchers"),
		consume: (id: string) =>
			fin(`/user-vouchers/${id}/consume`, { method: "POST" }),
	},
	nfse: {
		list: () => fin("/nfse"),
		create: (data: Partial<NFSeRecord>) =>
			fin("/nfse", { method: "POST", body: JSON.stringify(data) }),
		update: (id: string, data: Partial<NFSeRecord>) =>
			fin(`/nfse/${id}`, { method: "PUT", body: JSON.stringify(data) }),
		delete: (id: string) => fin(`/nfse/${id}`, { method: "DELETE" }),
	},
	nfseConfig: {
		get: () => fin("/nfse-config"),
		upsert: (data: Partial<NFSeConfigRecord>) =>
			fin("/nfse-config", { method: "PUT", body: JSON.stringify(data) }),
	},
};

export const recibosApi = {
	list: (params?: { limit?: number; offset?: number }) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {})
				.filter(([, v]) => v != null)
				.map(([k, v]) => [k, String(v)]),
		).toString();
		return request<{ data: Recibo[] }>(`/api/recibos${qs ? `?${qs}` : ""}`);
	},
	create: (data: {
		patient_id?: string | null;
		valor: number;
		valor_extenso?: string | null;
		referente?: string | null;
		data_emissao?: string;
		emitido_por?: string | null;
		cpf_cnpj_emitente?: string | null;
		assinado?: boolean;
	}) =>
		request<{ data: Recibo }>("/api/recibos", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	lastNumber: () =>
		request<{ data: RecibosLastNumber }>("/api/recibos/last-number"),
};
