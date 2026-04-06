/**
 * Hasura GraphQL Client - FisioFlow
 * Centraliza a comunicação com o Hasura Cloud sobre o Neon DB.
 */

import { getServerOnlyEnv } from "@/lib/config/server-only";

export async function fetchGraphQL(query: string, variables = {}) {
	const endpoint = import.meta.env.VITE_HASURA_PROJECT_URL;
	const adminSecret = getServerOnlyEnv("HASURA_ADMIN_SECRET");

	if (!endpoint) {
		console.error(
			"[GraphQL] Endpoint não configurado (VITE_HASURA_PROJECT_URL)",
		);
		return { data: null, errors: [{ message: "Endpoint missing" }] };
	}

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(adminSecret
					? { "x-hasura-admin-secret": adminSecret }
					: {}),
			},
			body: JSON.stringify({ query, variables }),
		});

		const result = await response.json();

		if (result.errors) {
			console.warn("[GraphQL Errors]", result.errors);
		}

		return result;
	} catch (error) {
		console.error("[GraphQL Fetch Error]", error);
		return { data: null, errors: [{ message: "Network error" }] };
	}
}

/**
 * Exemplos de Queries comuns para o FisioFlow
 */

export const QUERIES = {
	// Busca lista simplificada de pacientes
	GET_PATIENTS_SUMMARY: `
    query GetPatients {
      patients(order_by: { name: asc }) {
        id
        name
        email
        phone
      }
    }
  `,

	// Busca agendamentos do dia
	GET_TODAY_APPOINTMENTS: `
    query GetTodayAppointments($date: date!) {
      appointments(where: { date: { _eq: $date } }) {
        id
        start_time
        end_time
        patient {
          name
        }
        status
      }
    }
  `,

	// Busca estatísticas rápidas da clínica
	GET_CLINIC_STATS: `
    query GetClinicStats {
      patients_aggregate {
        aggregate {
          count
        }
      }
      appointments_aggregate(where: { status: { _eq: "confirmed" } }) {
        aggregate {
          count
        }
      }
    }
  `,
};
