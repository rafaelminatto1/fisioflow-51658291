// import { db } from "@fisioflow/db";
// import { background_jobs_log } from "@fisioflow/db/schema";
// import { eq } from "drizzle-orm";

/**
 * Verifica se um job já foi iniciado ou concluído para garantir idempotência.
 * Implementação simulada conectando ao Drizzle futuramente.
 */
export async function checkIdempotency(jobId: string): Promise<boolean> {
  // const existing = await db.query.background_jobs_log.findFirst({
  //   where: eq(background_jobs_log.jobId, jobId)
  // });
  // return existing !== undefined;
  
  return false; 
}
