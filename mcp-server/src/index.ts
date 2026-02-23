#!/usr/bin/env node

/**
 * Fisioflow MCP Server
 *
 * A Model Context Protocol server for Fisioflow integration with Sentry monitoring
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.API_BASE_URL || "https://api.fisioflow.com/v2";
const SENTRY_DSN = process.env.SENTRY_DSN || "";
const ORGANIZATION_ID = process.env.ORGANIZATION_ID || "";

// ============================================================================
// SENTRY INITIALIZATION
// ============================================================================

let Sentry: any = null;
if (SENTRY_DSN) {
  try {
    Sentry = await import("@sentry/core");
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 1.0,
      sendDefaultPii: true,
      environment: process.env.NODE_ENV || "development",
    });
    console.error("Sentry monitoring enabled");
  } catch (error) {
    console.error("Failed to initialize Sentry:", error);
  }
}

// Helper function to capture errors
const captureError = (error: any, context?: string) => {
  console.error(`Error in ${context || "unknown"}:`, error);
  if (Sentry) {
    Sentry.captureException(error, {
      tags: { context: context || "unknown" },
    });
  }
};

// Helper function for HTTP requests to Fisioflow API
async function fetchFromApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new McpServer({
  name: "fisioflow-mcp-server",
  version: "1.0.0",
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Get patient information by ID
 */
server.registerTool("get_patient", {
  description: "Retrieve patient information from Fisioflow",
  inputSchema: z.object({
    patientId: z.string({
      description: "The unique ID of the patient",
    }),
  }),
}, async (args: any) => {
  try {
    const { patientId } = args;

    const response = await fetchFromApi(`/patients/${patientId}`, {
      method: "GET",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: response.id,
            name: response.name,
            email: response.email,
            phone: response.phone,
            cpf: response.cpf,
            birth_date: response.birth_date,
            status: response.status,
            progress: response.progress,
            created_at: response.created_at,
            updated_at: response.updated_at,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "get_patient");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * List all patients
 */
server.registerTool("list_patients", {
  description: "List all patients in Fisioflow",
  inputSchema: z.object({
    limit: z.number({
      description: "Maximum number of patients to return",
    }).optional().default(10),
    offset: z.number({
      description: "Number of patients to skip",
    }).optional().default(0),
    search: z.string({
      description: "Search term to filter patients",
    }).optional(),
    status: z.string({
      description: "Filter by status (Inicial, Em Tratamento, Recuperação)",
    }).optional(),
  }),
}, async (args: any) => {
  try {
    const { limit = 10, offset = 0, search, status } = args;

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(search && { search }),
      ...(status && { status }),
    });

    const response = await fetchFromApi(`/patients?${params.toString()}`, {
      method: "GET",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            total: response.total || 0,
            limit,
            offset,
            data: response.data || [],
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "list_patients");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Create a new patient
 */
server.registerTool("create_patient", {
  description: "Create a new patient in Fisioflow",
  inputSchema: z.object({
    name: z.string({
      description: "Patient name",
    }),
    email: z.string({
      description: "Patient email",
    }).optional(),
    phone: z.string({
      description: "Patient phone",
    }).optional(),
    cpf: z.string({
      description: "Patient CPF",
    }).optional(),
    birth_date: z.string({
      description: "Patient birth date (YYYY-MM-DD)",
    }).optional(),
    gender: z.string({
      description: "Patient gender (masculino, feminino, outro)",
    }).optional(),
    observations: z.string({
      description: "Patient observations",
    }).optional(),
    status: z.string({
      description: "Patient status (Inicial, Em Tratamento, Recuperação)",
    }).optional(),
  }),
}, async (args: any) => {
  try {
    const response = await fetchFromApi("/patients", {
      method: "POST",
      body: JSON.stringify(args),
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "create_patient");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Create a new appointment
 */
server.registerTool("create_appointment", {
  description: "Create a new appointment in Fisioflow",
  inputSchema: z.object({
    patientId: z.string({
      description: "The ID of the patient",
    }),
    date: z.string({
      description: "Appointment date (YYYY-MM-DD)",
    }),
    startTime: z.string({
      description: "Start time (HH:MM)",
    }),
    duration: z.number({
      description: "Duration in minutes",
    }).optional().default(60),
    type: z.string({
      description: "Appointment type (avaliacao, tratamento, retorno, etc)",
    }).optional(),
    room: z.string({
      description: "Room/Room",
    }).optional(),
    notes: z.string({
      description: "Appointment notes",
    }).optional(),
  }),
}, async (args: any) => {
  try {
    const { patientId, date, startTime, duration, type, room, notes } = args;

    const appointmentData = {
      patient_id: patientId,
      date,
      start_time: startTime,
      duration,
      ...(type && { type }),
      ...(room && { room }),
      ...(notes && { notes }),
    };

    const response = await fetchFromApi("/appointments", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "create_appointment");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Get appointment information
 */
server.registerTool("get_appointment", {
  description: "Retrieve appointment information from Fisioflow",
  inputSchema: z.object({
    appointmentId: z.string({
      description: "The unique ID of the appointment",
    }),
  }),
}, async (args: any) => {
  try {
    const { appointmentId } = args;

    const response = await fetchFromApi(`/appointments/${appointmentId}`, {
      method: "GET",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: response.id,
            patient_id: response.patient_id,
            patient_name: response.patient_name,
            therapist_id: response.therapist_id,
            therapist_name: response.therapist_name,
            date: response.date,
            start_time: response.start_time,
            duration: response.duration,
            type: response.type,
            status: response.status,
            room: response.room,
            notes: response.notes,
            created_at: response.created_at,
            updated_at: response.updated_at,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "get_appointment");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Get agenda for a specific date range
 */
server.registerTool("get_agenda", {
  description: "Get the agenda for a specific date range",
  inputSchema: z.object({
    startDate: z.string({
      description: "Start date (YYYY-MM-DD)",
    }),
    endDate: z.string({
      description: "End date (YYYY-MM-DD)",
    }),
    limit: z.number({
      description: "Maximum number of appointments to return",
    }).optional(),
  }),
}, async (args: any) => {
  try {
    const { startDate, endDate, limit } = args;

    const params = new URLSearchParams({
      dateFrom: startDate,
      dateTo: endDate,
      ...(limit && { limit: limit.toString() }),
    });

    const response = await fetchFromApi(`/appointments?${params.toString()}`, {
      method: "GET",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            startDate,
            endDate,
            appointments: response.data || [],
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "get_agenda");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Get evolution notes for a patient
 */
server.registerTool("get_evolution", {
  description: "Get evolution notes for a patient",
  inputSchema: z.object({
    patientId: z.string({
      description: "The ID of the patient",
    }),
    limit: z.number({
      description: "Maximum number of notes to return",
    }).optional(),
  }),
}, async (args: any) => {
  try {
    const { patientId, limit } = args;

    const params = new URLSearchParams({
      ...(limit && { limit: limit.toString() }),
    });

    const response = await fetchFromApi(`/clinical/records?patientId=${patientId}&${params.toString()}`, {
      method: "GET",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            patientId,
            notes: response.data || [],
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "get_evolution");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Create a new evolution note
 */
server.registerTool("create_evolution", {
  description: "Create a new evolution note for a patient",
  inputSchema: z.object({
    patientId: z.string({
      description: "The ID of the patient",
    }),
    content: z.string({
      description: "The content of the evolution note",
    }),
    type: z.string({
      description: "Type of evolution note (evolucao, SOAP, etc)",
    }).optional(),
    tags: z.array(z.string({
      description: "Tags for the evolution",
    })).optional(),
  }),
}, async (args: any) => {
  try {
    const { patientId, content, type, tags } = args;

    const evolutionData = {
      patient_id: patientId,
      content,
      ...(type && { type }),
      ...(tags && { tags }),
    };

    const response = await fetchFromApi("/clinical/records", {
      method: "POST",
      body: JSON.stringify(evolutionData),
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "create_evolution");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Search patients by query
 */
server.registerTool("search_patients", {
  description: "Search patients by name, email, or other criteria",
  inputSchema: z.object({
    query: z.string({
      description: "Search query",
    }),
    limit: z.number({
      description: "Maximum number of results",
    }).optional().default(10),
  }),
}, async (args: any) => {
  try {
    const { query, limit = 10 } = args;

    const params = new URLSearchParams({
      search: query,
      limit: limit.toString(),
    });

    const response = await fetchFromApi(`/patients?${params.toString()}`, {
      method: "GET",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            query,
            results: response.data || [],
            total: response.total || 0,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "search_patients");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Update patient
 */
server.registerTool("update_patient", {
  description: "Update existing patient information",
  inputSchema: z.object({
    patientId: z.string({
      description: "The ID of the patient to update",
    }),
    name: z.string({
      description: "Patient name",
    }).optional(),
    email: z.string({
      description: "Patient email",
    }).optional(),
    phone: z.string({
      description: "Patient phone",
    }).optional(),
    status: z.string({
      description: "Patient status (Inicial, Em Tratamento, Recuperação)",
    }).optional(),
    progress: z.number({
      description: "Patient progress percentage (0-100)",
    }).optional(),
    observations: z.string({
      description: "Patient observations",
    }).optional(),
  }),
}, async (args: any) => {
  try {
    const { patientId, ...updates } = args;

    const response = await fetchFromApi(`/patients/${patientId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "update_patient");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Cancel appointment
 */
server.registerTool("cancel_appointment", {
  description: "Cancel an existing appointment",
  inputSchema: z.object({
    appointmentId: z.string({
      description: "The ID of the appointment to cancel",
    }),
    reason: z.string({
      description: "Reason for cancellation",
    }).optional(),
  }),
}, async (args: any) => {
  try {
    const { appointmentId, reason } = args;

    const response = await fetchFromApi(`/appointments/${appointmentId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            appointment: response,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    captureError(error, "cancel_appointment");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Get server status
 */
server.registerTool("status", {
  description: "Get the status of the Fisioflow MCP server",
  inputSchema: z.object({}),
}, async () => {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "healthy",
            version: "1.0.0",
            name: "fisioflow-mcp-server",
            sentry: SENTRY_DSN ? "enabled" : "disabled",
            api_url: API_BASE_URL,
            organization_id: ORGANIZATION_ID || "not_configured",
            timestamp: new Date().toISOString(),
            tools: [
              "get_patient",
              "list_patients",
              "create_patient",
              "update_patient",
              "create_appointment",
              "get_appointment",
              "cancel_appointment",
              "get_agenda",
              "get_evolution",
              "create_evolution",
              "search_patients",
              "status",
            ],
          },
          null,
          2
        ),
      },
    ],
  };
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  if (Sentry) {
    Sentry.addBreadcrumb({
      category: "server",
      message: "Fisioflow MCP Server started",
      level: "info",
    });
  }

  console.error("Fisioflow MCP Server started successfully");
  console.error(`API URL: ${API_BASE_URL}`);
  console.error(`Sentry: ${SENTRY_DSN ? "enabled" : "disabled"}`);
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  if (Sentry) {
    Sentry.captureException(error);
  }
  process.exit(1);
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  if (Sentry) {
    Sentry.captureException(error);
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  if (Sentry) {
    Sentry.captureException(reason);
  }
});
