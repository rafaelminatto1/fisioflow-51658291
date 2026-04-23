import { useQuery } from "@tanstack/react-query";
import {
	financialApi,
	type FinancialCommandCenterData,
	type FinancialCommandCenterPeriod,
} from "@/api/v2/financial";
import { useAuth } from "@/hooks/useAuth";
import { fisioLogger as logger } from "@/lib/errors/logger";

const emptyState: FinancialCommandCenterData = {
	period: {
		key: "monthly",
		label: "Últimos 30 dias",
		startDate: "",
		endDate: "",
		previousStartDate: "",
		previousEndDate: "",
	},
	summary: {
		cashPosition: 0,
		realizedRevenue: 0,
		realizedExpenses: 0,
		netBalance: 0,
		pendingReceivables: 0,
		pendingPayables: 0,
		overdueAmount: 0,
		averageTicket: 0,
		estimatedMargin: 0,
		collectionRate: 0,
		monthlyGrowth: 0,
		activePatients: 0,
		projectedNext30Days: 0,
	},
	projection: {
		rawExpectedRevenue: 0,
		adjustedExpectedRevenue: 0,
		scheduledSessions: 0,
		noShowRate: 0,
		packageInventoryValue: 0,
	},
	cashflow: {
		points: [],
		totals: {
			income: 0,
			expense: 0,
			balance: 0,
		},
	},
	collections: {
		overdueCount: 0,
		dueTodayCount: 0,
		topAccounts: [],
		todayCollections: [],
	},
	documents: {
		receiptsInPeriod: 0,
		lastReceiptNumber: 0,
		pendingNfse: 0,
		authorizedNfse: 0,
		failedNfse: 0,
	},
	integrations: {
		patients: {
			activeCount: 0,
			newPatients: 0,
			convertedPatients: 0,
			riskPatients: [],
		},
		crm: {
			totalLeads: 0,
			pipelineLeads: 0,
			hotLeads: 0,
			openTasks: 0,
			overdueTasks: 0,
			topStage: {
				name: "Sem estágio",
				total: 0,
			},
			campaignsInPeriod: 0,
		},
		marketing: {
			recallActive: 0,
			referralRedemptions: 0,
			convertedLeads: 0,
			newPatientsInPeriod: 0,
		},
		schedule: {
			completedSessions: 0,
			scheduledNext7Days: 0,
			scheduledNext30Days: 0,
			expectedRevenueNext30Days: 0,
			noShowRate90d: 0,
		},
	},
	recentTransactions: [],
	recentDocuments: [],
	alerts: [],
	suggestions: [],
};

export function useFinancialCommandCenter(
	period: FinancialCommandCenterPeriod = "monthly",
) {
	const { organizationId } = useAuth();

	return useQuery({
		queryKey: ["financial-command-center", organizationId, period],
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 3,
		gcTime: 1000 * 60 * 10,
		queryFn: async () => {
			try {
				const response = await financialApi.commandCenter.get(period);
				return response?.data ?? emptyState;
			} catch (error) {
				logger.error(
					"Error loading financial command center",
					{ error, period },
					"useFinancialCommandCenter",
				);
				return {
					...emptyState,
					period: {
						...emptyState.period,
						key: period,
					},
				};
			}
		},
	});
}
