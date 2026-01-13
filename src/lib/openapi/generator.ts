// Gerador de OpenAPI spec a partir dos schemas Zod
import { z } from 'zod';

// OpenAPI JSON Schema types (simplified)
export type JSONSchema =
  | { type: 'string' | 'number' | 'integer' | 'boolean'; format?: string; enum?: unknown[] }
  | { type: 'array'; items: JSONSchema }
  | { type: 'object'; properties?: Record<string, JSONSchema>; required?: string[] }
  | { oneOf: JSONSchema[]; anyOf: JSONSchema[]; allOf: JSONSchema[] }
  | { type: string; [key: string]: unknown };

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, JSONSchema>;
    securitySchemes?: Record<string, JSONSchema>;
  };
}

/**
 * Converte um schema Zod para um schema OpenAPI
 */
export function zodToOpenAPI(schema: z.ZodTypeAny): JSONSchema {
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  if (schema instanceof z.ZodDate) {
    return { type: 'string', format: 'date-time' };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: schema._def.values };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToOpenAPI(value as z.ZodTypeAny);
      // Verificar se é obrigatório (não é optional ou nullable)
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodNullable)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    };
  }
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToOpenAPI(schema._def.type),
    };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToOpenAPI(schema._def.innerType);
  }
  if (schema instanceof z.ZodNullable) {
    return {
      ...zodToOpenAPI(schema._def.innerType),
      nullable: true,
    };
  }

  // Fallback
  return { type: 'string' };
}

/**
 * Gera uma spec OpenAPI básica
 */
export function generateOpenAPISpec(): OpenAPISpec {
  return {
    openapi: '3.1.0',
    info: {
      title: 'FisioFlow v3.0 API',
      version: '1.0.0',
      description: 'API REST do Sistema de Gestão para Clínicas de Fisioterapia Esportiva',
    },
    servers: [
      {
        url: 'https://ycvbtjfrchcyvmkvuocu.supabase.co/functions/v1',
        description: 'Produção',
      },
      {
        url: 'http://localhost:54321/functions/v1',
        description: 'Desenvolvimento Local',
      },
    ],
    paths: {
      '/api-patients': {
        get: {
          tags: ['Patients'],
          summary: 'Listar pacientes',
          description: 'Retorna lista paginada de pacientes da organização',
          operationId: 'listPatients',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de pacientes',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Patient' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Patients'],
          summary: 'Cadastrar paciente',
          operationId: 'createPatient',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PatientCreate' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Paciente criado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Patient' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            cpf: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            birth_date: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['M', 'F', 'O'] },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        PatientCreate: {
          type: 'object',
          required: ['name', 'cpf', 'phone', 'email', 'birth_date'],
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 100 },
            cpf: { type: 'string', pattern: '^\\d{11}$' },
            phone: { type: 'string', minLength: 10 },
            email: { type: 'string', format: 'email' },
            birth_date: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['M', 'F', 'O'] },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };
}

