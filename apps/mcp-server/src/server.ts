import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchEvidence, searchEvidenceSchema } from "./tools/searchEvidence";
import { searchExercises, searchExercisesSchema } from "./tools/searchExercises";
import { getPatientHistory, getPatientHistorySchema } from "./tools/getPatientHistory";
import { scheduleSession, scheduleSessionSchema } from "./tools/scheduleSession";

export interface Env {
  FISIOFLOW_API_URL: string;
  MCP_OBJECT: DurableObjectNamespace;
}

type Props = { token: string };

export class FisioFlowMCP extends McpAgent<Env, unknown, Props> {
  server = new McpServer({ name: "fisioflow", version: "1.0.0" });

  async init() {
    const apiUrl = this.env.FISIOFLOW_API_URL;
    const token = () => this.props?.token ?? "";
    const ok = (data: unknown) => ({
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
    });
    const err = (e: unknown) => ({
      isError: true,
      content: [{ type: "text" as const, text: String((e as Error)?.message ?? e) }],
    });

    this.server.tool(
      "search_evidence",
      "Busca evidência científica (PubMed) no FisioFlow.",
      searchEvidenceSchema.shape,
      async (a) => {
        try {
          return ok(await searchEvidence(apiUrl, token(), a));
        } catch (e) {
          return err(e);
        }
      },
    );

    this.server.tool(
      "search_exercises",
      "Busca exercícios na biblioteca do FisioFlow.",
      searchExercisesSchema.shape,
      async (a) => {
        try {
          return ok(await searchExercises(apiUrl, token(), a));
        } catch (e) {
          return err(e);
        }
      },
    );

    this.server.tool(
      "get_patient_history",
      "Histórico do paciente (dados + sessões).",
      getPatientHistorySchema.shape,
      async (a) => {
        try {
          return ok(await getPatientHistory(apiUrl, token(), a));
        } catch (e) {
          return err(e);
        }
      },
    );

    this.server.tool(
      "schedule_session",
      "Agenda uma sessão/consulta para um paciente.",
      scheduleSessionSchema.shape,
      async (a) => {
        try {
          return ok(await scheduleSession(apiUrl, token(), a));
        } catch (e) {
          return err(e);
        }
      },
    );
  }
}
