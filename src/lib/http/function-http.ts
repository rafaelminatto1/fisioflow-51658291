/**
 * HTTP helpers for legacy callable endpoints
 */

/* eslint-disable @typescript-eslint/no-namespace */

import { API_URLS } from '@/lib/api/v2/config';
import { getNeonAccessToken } from '@/lib/auth/neon-token';

const _DEFAULT_TIMEOUT = 60;

const HTTP_FUNCTION_URLS: Record<string, string> = {
  getProfile: API_URLS.profile.get,
  updateProfile: API_URLS.profile.update,
  listAssessmentTemplatesV2: API_URLS.assessments.listTemplates,
  getPatientHttp: API_URLS.patients.get,
  listPatientsV2: API_URLS.patients.list,
  getPatientStatsV2: API_URLS.patients.stats,
  updatePatientV2: API_URLS.patients.update,
  deletePatientV2: API_URLS.patients.delete,
  listAppointments: API_URLS.appointments.list,
  getAppointmentV2: API_URLS.appointments.get,
  createAppointmentV2: API_URLS.appointments.create,
  updateAppointmentV2: API_URLS.appointments.update,
  cancelAppointmentV2: API_URLS.appointments.cancel,
  checkTimeConflictV2: API_URLS.appointments.checkConflict,
  listDoctors: API_URLS.doctors.list,
  searchDoctorsV2: API_URLS.doctors.search,
  listExercisesV2: API_URLS.exercises.list,
  getExerciseV2: API_URLS.exercises.get,
  searchSimilarExercises: API_URLS.exercises.searchSimilar,
  searchSimilarExercisesV2: API_URLS.exercises.searchSimilar,
  listTransactionsV2: API_URLS.financial.listTransactions,
  createTransactionV2: API_URLS.financial.createTransaction,
  updateTransactionV2: API_URLS.financial.updateTransaction,
  deleteTransactionV2: API_URLS.financial.deleteTransaction,
  findTransactionByAppointmentIdV2: API_URLS.financial.findTransactionByAppointmentId,
  getEventReportV2: API_URLS.financial.getEventReport,
  getFinancialSummaryV2: API_URLS.financial.getSummary,
  patientServiceHttp: API_URLS.services.patient,
  appointmentServiceHttp: API_URLS.services.appointment,
  evolutionServiceHttp: API_URLS.services.evolution,
  setupAnalytics: API_URLS.analytics.setup,
  dashboardMetrics: API_URLS.analytics.dashboard,
  patientEvolution: API_URLS.analytics.evolution,
  organizationStats: API_URLS.analytics.organization,
  topExercises: API_URLS.analytics.exercises,
  painMapAnalysis: API_URLS.analytics.painMap,
  usageStats: API_URLS.analytics.usage,
};
const LOCAL_FUNCTIONS_PROXY =
  import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_PROXY === 'true'
    ? (import.meta.env.VITE_FUNCTIONS_PROXY || '/functions')
    : undefined;

import { getWorkersApiUrl } from '../api/config';

const WORKERS_API_BASE = getWorkersApiUrl();

async function callWorkersApi<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  if (!WORKERS_API_BASE) {
    throw new Error('VITE_WORKERS_API_URL não configurada');
  }

  const token = await getNeonAccessToken();
  const endpoint = `${WORKERS_API_BASE}${path}`;
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (response.status === 401) {
    const refreshedToken = await getNeonAccessToken({ forceSessionReload: true });
    const retry = await fetch(endpoint, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshedToken}`,
        ...(init?.headers || {}),
      },
    });

    if (!retry.ok) {
      const retryBody = await retry.text().catch(() => '');
      throw new Error(retryBody || `Workers API error ${retry.status}`);
    }

    return retry.json() as Promise<TResponse>;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Workers API error ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export function getFirebaseFunctions() {
  return functionsInstance;
}

export interface FunctionResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

export class FunctionCallError extends Error {
  constructor(
    public functionName: string,
    public originalError: unknown,
    public payload?: unknown,
    message?: string,
  ) {
    super(message || `Error calling function '${functionName}': ${String(originalError)}`);
    this.name = 'FunctionCallError';
  }
}

interface CallFunctionOptions {
  timeout?: number;
}

export async function callFunction<TRequest, TResponse>(
  functionName: string,
  data: TRequest,
  options?: CallFunctionOptions,
): Promise<TResponse> {
  return callFunctionHttp<TRequest, TResponse>(functionName, data, options);
}

export async function callFunctionWithResponse<TRequest, TData>(
  functionName: string,
  data: TRequest,
  options?: CallFunctionOptions,
): Promise<FunctionResponse<TData>> {
  const response = await callFunction<TRequest, FunctionResponse<TData>>(functionName, data, options);
  if (response.error && !response.data) {
    throw new FunctionCallError(functionName, response.error);
  }
  return response;
}

export async function callFunctionHttp<TRequest, TResponse>(
  functionName: string,
  data: TRequest,
  _options?: CallFunctionOptions,
): Promise<TResponse> {
  const directUrl = HTTP_FUNCTION_URLS[functionName];
  if (directUrl) {
    const path = new URL(directUrl).pathname.replace(/^\/api/, '/api');
    return callWorkersApi<TResponse>(path, { method: 'POST', body: JSON.stringify(data) });
  }

  if (LOCAL_FUNCTIONS_PROXY) {
    const response = await fetch(`${LOCAL_FUNCTIONS_PROXY}/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new FunctionCallError(functionName, await response.text().catch(() => response.statusText), data);
    }
    return response.json() as Promise<TResponse>;
  }

  throw new FunctionCallError(functionName, 'Function mapping not configured', data);
}

export async function callFunctionHttpWithResponse<TRequest, TData>(
  functionName: string,
  data: TRequest,
  options?: CallFunctionOptions,
): Promise<FunctionResponse<TData>> {
  const response = await callFunctionHttp<TRequest, FunctionResponse<TData>>(functionName, data, options);
  if (response.error && !response.data) {
    throw new FunctionCallError(functionName, response.error, data);
  }
  return response;
}
