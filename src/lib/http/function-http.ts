/**
 * HTTP helpers for legacy callable endpoints.
 *
 * This compatibility layer maps historical callable names to the
 * equivalent Cloudflare Workers routes.
 */

import { getWorkersApiUrl } from '../api/config';
import { getNeonAccessToken } from '@/lib/auth/neon-token';

const WORKERS_API_BASE = getWorkersApiUrl();
const legacyFunctionsAdapter = null;

type JsonValue = string | number | boolean | null | undefined;
type JsonRecord = Record<string, unknown>;
type LegacyRouteDescriptor = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
};
type LegacyRouteMapper = (payload: JsonRecord) => LegacyRouteDescriptor;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function requireId(payload: JsonRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  throw new Error(`Missing required identifier: ${keys.join(' | ')}`);
}

function stripKeys(payload: JsonRecord, keys: string[]): JsonRecord {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !keys.includes(key)),
  );
}

function nestedOrPayload(payload: JsonRecord, key: string): JsonRecord {
  const nested = asRecord(payload[key]);
  return Object.keys(nested).length > 0 ? nested : payload;
}

function buildQuery(params: Record<string, JsonValue>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

const LEGACY_FUNCTION_ROUTES: Record<string, LegacyRouteMapper> = {
  getProfile: () => ({
    method: 'GET',
    path: '/api/profile/me',
  }),
  updateProfile: (payload) => ({
    method: 'PUT',
    path: '/api/profile/me',
    body: payload,
  }),
  listAssessmentTemplatesV2: (payload) => ({
    method: 'GET',
    path: `/api/evaluation-forms${buildQuery({
      tipo: payload.tipo,
      ativo: payload.ativo as JsonValue,
      favorite: payload.favorite as JsonValue,
    })}`,
  }),
  getPatientHttp: (payload) => ({
    method: 'GET',
    path: `/api/patients/${encodeURIComponent(requireId(payload, 'patientId', 'id'))}`,
  }),
  listPatientsV2: (payload) => ({
    method: 'GET',
    path: `/api/patients${buildQuery({
      search: (payload.search ?? payload.searchTerm ?? payload.q) as JsonValue,
      status: payload.status as JsonValue,
      createdFrom: payload.createdFrom as JsonValue,
      createdTo: payload.createdTo as JsonValue,
      incompleteRegistration: payload.incompleteRegistration as JsonValue,
      sortBy: payload.sortBy as JsonValue,
      limit: payload.limit as JsonValue,
      offset: payload.offset as JsonValue,
    })}`,
  }),
  getPatientStatsV2: (payload) => ({
    method: 'GET',
    path: `/api/patients/${encodeURIComponent(requireId(payload, 'patientId', 'id'))}/stats`,
  }),
  updatePatientV2: (payload) => {
    const patientId = requireId(payload, 'patientId', 'id');
    return {
      method: 'PUT',
      path: `/api/patients/${encodeURIComponent(patientId)}`,
      body: stripKeys(payload, ['patientId', 'id']),
    };
  },
  deletePatientV2: (payload) => ({
    method: 'DELETE',
    path: `/api/patients/${encodeURIComponent(requireId(payload, 'patientId', 'id'))}`,
  }),
  listAppointments: (payload) => ({
    method: 'GET',
    path: `/api/appointments${buildQuery({
      dateFrom: payload.dateFrom as JsonValue,
      dateTo: payload.dateTo as JsonValue,
      therapistId: (payload.therapistId ?? payload.professionalId) as JsonValue,
      status: payload.status as JsonValue,
      patientId: payload.patientId as JsonValue,
      limit: payload.limit as JsonValue,
      offset: payload.offset as JsonValue,
    })}`,
  }),
  getAppointmentV2: (payload) => ({
    method: 'GET',
    path: `/api/appointments/${encodeURIComponent(requireId(payload, 'appointmentId', 'id'))}`,
  }),
  createAppointmentV2: (payload) => ({
    method: 'POST',
    path: '/api/appointments',
    body: nestedOrPayload(payload, 'appointment'),
  }),
  updateAppointmentV2: (payload) => {
    const nested = nestedOrPayload(payload, 'appointment');
    const appointmentId = requireId(
      { ...nested, ...payload },
      'appointmentId',
      'id',
    );

    return {
      method: 'PUT',
      path: `/api/appointments/${encodeURIComponent(appointmentId)}`,
      body: stripKeys(nested, ['appointmentId', 'id']),
    };
  },
  cancelAppointmentV2: (payload) => ({
    method: 'POST',
    path: `/api/appointments/${encodeURIComponent(requireId(payload, 'appointmentId', 'id'))}/cancel`,
    body: payload.reason ? { reason: payload.reason } : {},
  }),
  checkTimeConflictV2: (payload) => ({
    method: 'POST',
    path: '/api/appointments/check-conflict',
    body: payload,
  }),
  listDoctors: (payload) => ({
    method: 'GET',
    path: `/api/doctors${buildQuery({
      search: (payload.search ?? payload.searchTerm ?? payload.q) as JsonValue,
      limit: payload.limit as JsonValue,
    })}`,
  }),
  searchDoctorsV2: (payload) => ({
    method: 'GET',
    path: `/api/doctors${buildQuery({
      search: (payload.search ?? payload.searchTerm ?? payload.q) as JsonValue,
      limit: payload.limit as JsonValue,
    })}`,
  }),
  listExercisesV2: (payload) => ({
    method: 'GET',
    path: `/api/exercises${buildQuery({
      q: payload.q as JsonValue,
      category: payload.category as JsonValue,
      difficulty: payload.difficulty as JsonValue,
      page: payload.page as JsonValue,
      limit: payload.limit as JsonValue,
    })}`,
  }),
  getExerciseV2: (payload) => ({
    method: 'GET',
    path: `/api/exercises/${encodeURIComponent(requireId(payload, 'exerciseId', 'id', 'slug'))}`,
  }),
  searchSimilarExercises: (payload) => ({
    method: 'GET',
    path: `/api/exercises/search/semantic${buildQuery({
      q: (payload.query ?? payload.q) as JsonValue,
      limit: payload.limit as JsonValue,
    })}`,
  }),
  searchSimilarExercisesV2: (payload) => ({
    method: 'GET',
    path: `/api/exercises/search/semantic${buildQuery({
      q: (payload.query ?? payload.q) as JsonValue,
      limit: payload.limit as JsonValue,
    })}`,
  }),
  listTransactionsV2: (payload) => ({
    method: 'GET',
    path: `/api/financial/transacoes${buildQuery({
      tipo: payload.tipo as JsonValue,
      status: payload.status as JsonValue,
      dateFrom: payload.dateFrom as JsonValue,
      dateTo: payload.dateTo as JsonValue,
      limit: payload.limit as JsonValue,
      offset: payload.offset as JsonValue,
    })}`,
  }),
  createTransactionV2: (payload) => ({
    method: 'POST',
    path: '/api/financial/transacoes',
    body: payload,
  }),
  updateTransactionV2: (payload) => ({
    method: 'PUT',
    path: `/api/financial/transacoes/${encodeURIComponent(requireId(payload, 'transactionId', 'id'))}`,
    body: stripKeys(payload, ['transactionId', 'id']),
  }),
  deleteTransactionV2: (payload) => ({
    method: 'DELETE',
    path: `/api/financial/transacoes/${encodeURIComponent(requireId(payload, 'transactionId', 'id'))}`,
  }),
  findTransactionByAppointmentIdV2: (payload) => ({
    method: 'GET',
    path: `/api/financial/pagamentos${buildQuery({
      appointmentId: (payload.appointmentId ?? payload.id) as JsonValue,
      limit: 1,
    })}`,
  }),
  getEventReportV2: (payload) => ({
    method: 'GET',
    path: `/api/insights/financial${buildQuery({
      startDate: payload.startDate as JsonValue,
      endDate: payload.endDate as JsonValue,
    })}`,
  }),
  getFinancialSummaryV2: (payload) => ({
    method: 'GET',
    path: `/api/insights/financial${buildQuery({
      startDate: payload.startDate as JsonValue,
      endDate: payload.endDate as JsonValue,
    })}`,
  }),
  dashboardMetrics: (payload) => ({
    method: 'GET',
    path: `/api/insights/dashboard${buildQuery({
      period: payload.period as JsonValue,
      startDate: payload.startDate as JsonValue,
      endDate: payload.endDate as JsonValue,
    })}`,
  }),
  patientEvolution: (payload) => ({
    method: 'GET',
    path: `/api/insights/patient-evolution/${encodeURIComponent(requireId(payload, 'patientId', 'id'))}`,
  }),
  topExercises: (payload) => ({
    method: 'GET',
    path: `/api/insights/top-exercises${buildQuery({
      limit: payload.limit as JsonValue,
    })}`,
  }),
  painMapAnalysis: (payload) => ({
    method: 'GET',
    path: `/api/insights/pain-map${buildQuery({
      limit: payload.limit as JsonValue,
    })}`,
  }),
};

async function callWorkersApi<TResponse>(descriptor: LegacyRouteDescriptor): Promise<TResponse> {
  if (!WORKERS_API_BASE) {
    throw new Error('VITE_WORKERS_API_URL não configurada');
  }

  const token = await getNeonAccessToken();
  const endpoint = `${WORKERS_API_BASE}${descriptor.path}`;
  const init: RequestInit = {
    method: descriptor.method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  if (descriptor.body !== undefined) {
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    };
    init.body = JSON.stringify(descriptor.body);
  }

  const response = await fetch(endpoint, init);

  if (response.status === 401) {
    const refreshedToken = await getNeonAccessToken({ forceSessionReload: true });
    const retry = await fetch(endpoint, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${refreshedToken}`,
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

export function getLegacyFunctionsAdapter() {
  return legacyFunctionsAdapter;
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
  const payload = asRecord(data);
  const mapper = LEGACY_FUNCTION_ROUTES[functionName];

  if (mapper) {
    try {
      return await callWorkersApi<TResponse>(mapper(payload));
    } catch (error) {
      throw new FunctionCallError(functionName, error, data);
    }
  }

  throw new FunctionCallError(
    functionName,
    'Legacy callable mapping not configured for Workers compatibility',
    data,
  );
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
