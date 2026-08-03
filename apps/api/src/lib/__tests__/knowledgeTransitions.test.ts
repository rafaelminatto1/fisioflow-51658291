import { describe, expect, it } from "vitest";
import {
  allowedKnowledgeActions,
  validateKnowledgeTransition,
} from "../knowledgeTransitions";

describe("knowledge transitions", () => {
  it("allows an authenticated author to submit a draft", () => {
    expect(
      validateKnowledgeTransition({
        action: "submit",
        status: "draft",
        actorId: "author",
        authoredBy: "author",
        capabilities: [],
      }),
    ).toMatchObject({ ok: true, rule: { to: "triage" } });
  });

  it("blocks self approval even with clinical_review", () => {
    expect(
      validateKnowledgeTransition({
        action: "approve",
        status: "clinical_review",
        actorId: "author",
        submittedBy: "author",
        capabilities: ["clinical_review"],
      }),
    ).toEqual({ ok: false, code: "SELF_APPROVAL_FORBIDDEN" });
  });

  it("blocks a non-author from submitting an unassigned draft", () => {
    expect(
      validateKnowledgeTransition({
        action: "submit",
        status: "draft",
        actorId: "other-user",
        authoredBy: "author",
        isAssigned: false,
        capabilities: [],
      }),
    ).toEqual({ ok: false, code: "FORBIDDEN" });
  });

  it("blocks an author from approving even when another user submitted", () => {
    expect(
      validateKnowledgeTransition({
        action: "approve",
        status: "clinical_review",
        actorId: "author",
        authoredBy: "author",
        submittedBy: "submitter",
        capabilities: ["clinical_review"],
      }),
    ).toEqual({ ok: false, code: "SELF_APPROVAL_FORBIDDEN" });
  });

  it("requires a reason for rejection and changes requested", () => {
    expect(
      validateKnowledgeTransition({
        action: "reject",
        status: "clinical_review",
        actorId: "reviewer",
        capabilities: ["clinical_review"],
      }),
    ).toEqual({ ok: false, code: "REASON_REQUIRED" });
  });

  it("keeps publish separate from clinical approval", () => {
    expect(
      allowedKnowledgeActions({
        status: "approved",
        actorId: "publisher",
        submittedBy: "author",
        capabilities: ["publish_knowledge"],
      }),
    ).toContain("publish");
    expect(
      allowedKnowledgeActions({
        status: "approved",
        actorId: "reviewer",
        submittedBy: "author",
        capabilities: ["clinical_review"],
      }),
    ).not.toContain("publish");
  });

  it("does not archive a published version directly", () => {
    expect(
      validateKnowledgeTransition({
        action: "archive",
        status: "published",
        actorId: "curator",
        capabilities: ["manage_library"],
      }),
    ).toEqual({ ok: false, code: "INVALID_TRANSITION" });
  });
});
