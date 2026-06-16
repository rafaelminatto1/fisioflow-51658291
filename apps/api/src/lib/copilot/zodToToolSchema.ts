import { z } from "zod";

type JsonProp = { type: string; description?: string };

export function zodToToolSchema(schema: z.ZodObject<z.ZodRawShape>): {
  type: "object";
  properties: Record<string, JsonProp>;
  required: string[];
} {
  const properties: Record<string, JsonProp> = {};
  const required: string[] = [];

  for (const [key, raw] of Object.entries(schema.shape)) {
    let def = raw as z.ZodTypeAny;
    let optional = false;
    while (def instanceof z.ZodOptional || def instanceof z.ZodDefault) {
      if (def instanceof z.ZodOptional) optional = true;
      const anyDef = def as unknown as { unwrap?: () => z.ZodTypeAny; _def: { innerType: z.ZodTypeAny } };
      def = typeof anyDef.unwrap === "function" ? anyDef.unwrap() : anyDef._def.innerType;
    }
    let type = "string";
    if (def instanceof z.ZodNumber) type = "number";
    else if (def instanceof z.ZodBoolean) type = "boolean";
    properties[key] = { type };
    if (!optional) required.push(key);
  }

  return { type: "object", properties, required };
}
