import { neon } from "@neondatabase/serverless";
import type { DataApiConfig } from "./types";

/**
 * Neon Data API Client for Patient Portal
 * Enforces RLS by setting the app.patient_id session variable and assuming the patient_portal role.
 */
export class PatientDataApiClient {
  private sql: any;
  private patientId: string;

  constructor(config: DataApiConfig) {
    this.patientId = config.patientId;
    this.sql = neon(config.connectionString);
  }

  /**
   * Executes a read-only query with the patient_id session variable set.
   */
  async query<T = any>(queryText: string, params: any[] = []): Promise<T[]> {
    try {
      // Execute as a transaction so SET LOCAL applies to the query
      const results = await this.sql.transaction([
        this.sql('SET ROLE patient_portal'),
        this.sql('SELECT set_config(\'app.patient_id\', $1, true)', [this.patientId]),
        this.sql(queryText, params)
      ]);
      
      // The results array contains the result of each query in the transaction
      return results[2] as T[];
    } catch (error: any) {
      console.error("[DataAPI] Query failed:", error);
      throw new Error(`Data API Query Error: ${error.message}`);
    }
  }
}
