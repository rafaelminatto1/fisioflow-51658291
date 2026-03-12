import { request } from './base';
import type {
  PatientDocument,
  AtestadoTemplateRecord,
  ContratoTemplateRecord,
} from '@/types/workers';

export const documentsApi = {
  list: (patientId: string) =>
    request<{ data: PatientDocument[] }>(`/api/documents?patientId=${encodeURIComponent(patientId)}`),

  create: (data: Omit<PatientDocument, 'id' | 'organization_id' | 'uploaded_by' | 'created_at' | 'updated_at'>) =>
    request<{ data: PatientDocument }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean; file_path?: string }>(`/api/documents/${id}`, { method: 'DELETE' }),
};

export const documentTemplatesApi = {
  atestados: {
    list: () => request<{ data: AtestadoTemplateRecord[] }>('/api/documents/atestado-templates'),
    create: (data: Partial<AtestadoTemplateRecord>) =>
      request<{ data: AtestadoTemplateRecord }>('/api/documents/atestado-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<AtestadoTemplateRecord>) =>
      request<{ data: AtestadoTemplateRecord }>(`/api/documents/atestado-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/documents/atestado-templates/${id}`, { method: 'DELETE' }),
  },
  contratos: {
    list: () => request<{ data: ContratoTemplateRecord[] }>('/api/documents/contrato-templates'),
    create: (data: Partial<ContratoTemplateRecord>) =>
      request<{ data: ContratoTemplateRecord }>('/api/documents/contrato-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<ContratoTemplateRecord>) =>
      request<{ data: ContratoTemplateRecord }>(`/api/documents/contrato-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/documents/contrato-templates/${id}`, { method: 'DELETE' }),
  },
};
