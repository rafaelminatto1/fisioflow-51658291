import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("../db", () => ({ createPool: () => ({ query }) }));

import {
  hasKnowledgeCapability,
  resolveKnowledgeCapabilities,
} from "../knowledgeCapabilities";

describe("knowledge capabilities", () => {
  beforeEach(() => query.mockReset());

  it("returns only active persisted grants for the organization and user", async () => {
    query.mockResolvedValue({
      rows: [
        { capability: "clinical_review" },
        { capability: "manage_library" },
      ],
    });

    const result = await resolveKnowledgeCapabilities(
      {} as never,
      "org-1",
      "user-1",
    );

    expect(result).toEqual(["clinical_review", "manage_library"]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("revoked_at IS NULL"),
      ["org-1", "user-1"],
    );
  });

  it("does not infer capabilities from authentication roles", () => {
    expect(hasKnowledgeCapability([], "manage_library")).toBe(false);
    expect(hasKnowledgeCapability(["manage_library"], "manage_library")).toBe(
      true,
    );
  });
});
