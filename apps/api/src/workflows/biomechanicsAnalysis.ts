import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type { Env } from "../types/env";

export type BiomechanicsAnalysisParams = {
  jobId: string;
  assessmentId: string;
  mediaId?: string;
  patientId: string;
  organizationId: string;
};

export class BiomechanicsAnalysisWorkflow extends WorkflowEntrypoint<
  Env,
  BiomechanicsAnalysisParams
> {
  async run(event: WorkflowEvent<BiomechanicsAnalysisParams>, step: WorkflowStep) {
    const payload = event.payload;

    await step.do("enqueue-biomechanics-processing", async () => {
      await this.env.BACKGROUND_QUEUE.send({
        type: "PROCESS_BIOMECHANICS_MEDIA",
        payload,
      });
    });

    return {
      ok: true,
      jobId: payload.jobId,
      assessmentId: payload.assessmentId,
    };
  }
}
