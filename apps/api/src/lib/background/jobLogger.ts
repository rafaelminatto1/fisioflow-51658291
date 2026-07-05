// import { db } from "@fisioflow/db";
// import { background_jobs_log } from "@fisioflow/db/schema";
// import { eq } from "drizzle-orm";

export interface JobLogRecord {
  jobId: string;
  organizationId: string;
  taskType: string;
  startedAt: string;
}

/**
 * Registra o início do processamento de um Job (Queue ou Workflow).
 */
export async function logJobStart(record: JobLogRecord): Promise<void> {
  console.log(`[JOB START] ${record.taskType} | ID: ${record.jobId}`);
  /*
  await db.insert(background_jobs_log).values({
    jobId: record.jobId,
    organizationId: record.organizationId,
    taskType: record.taskType,
    status: "started",
    startedAt: new Date(record.startedAt)
  }).onConflictDoNothing();
  */
}

/**
 * Registra a finalização (sucesso ou falha) de um Job.
 */
export async function logJobFinish(
  jobId: string, 
  status: "completed" | "failed", 
  error?: string
): Promise<void> {
  console.log(`[JOB FINISH] ID: ${jobId} | Status: ${status} | Error: ${error || "None"}`);
  /*
  await db.update(background_jobs_log).set({
    status,
    error,
    finishedAt: new Date()
  }).where(eq(background_jobs_log.jobId, jobId));
  */
}
