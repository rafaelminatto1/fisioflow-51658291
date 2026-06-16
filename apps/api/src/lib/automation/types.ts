import { z } from "zod";

export const conditionOps = ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "exists"] as const;
export type ConditionOp = (typeof conditionOps)[number];

const triggerNode = z.object({ id: z.string(), type: z.literal("trigger"), event: z.string().optional() });
const conditionNode = z.object({
  id: z.string(),
  type: z.literal("condition"),
  field: z.string(),
  op: z.enum(conditionOps),
  value: z.unknown().optional(),
});
const actionNode = z.object({
  id: z.string(),
  type: z.literal("action"),
  action: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});
const waitNode = z.object({ id: z.string(), type: z.literal("wait"), seconds: z.number().int().min(0).max(2592000) });

export const automationNode = z.discriminatedUnion("type", [triggerNode, conditionNode, actionNode, waitNode]);
export type AutomationNode = z.infer<typeof automationNode>;

export const automationEdge = z.object({
  from: z.string(),
  to: z.string(),
  branch: z.enum(["true", "false"]).optional(),
});
export type AutomationEdge = z.infer<typeof automationEdge>;

export const automationDefinitionSchema = z.object({
  nodes: z.array(automationNode).min(1),
  edges: z.array(automationEdge).default([]),
});
export type AutomationDefinition = z.infer<typeof automationDefinitionSchema>;

export type TraceEntry = {
  id: string;
  type: AutomationNode["type"];
  passed?: boolean;
  action?: string;
  result?: unknown;
  error?: string;
  seconds?: number;
};
