import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodToToolSchema } from "../zodToToolSchema";

describe("zodToToolSchema", () => {
  it("maps a flat zod object to json-schema params", () => {
    const s = zodToToolSchema(z.object({ q: z.string(), limit: z.number().optional() }));
    expect(s.type).toBe("object");
    expect(s.properties.q.type).toBe("string");
    expect(s.properties.limit.type).toBe("number");
    expect(s.required).toEqual(["q"]);
  });

  it("treats default and optional as not required", () => {
    const s = zodToToolSchema(z.object({ a: z.string(), b: z.boolean().optional() }));
    expect(s.required).toEqual(["a"]);
    expect(s.properties.b.type).toBe("boolean");
  });
});
