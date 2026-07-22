import { describe, it, expect } from "vitest";
import { isPatientKnowledgeEnabled, PATIENT_KNOWLEDGE_FLAG } from "./patientKnowledgeFlag";

describe("patientKnowledgeFlag", () => {
  it("is disabled by default when the flag is absent", () => {
    expect(isPatientKnowledgeEnabled(null)).toBe(false);
    expect(isPatientKnowledgeEnabled(undefined)).toBe(false);
    expect(isPatientKnowledgeEnabled({})).toBe(false);
    expect(isPatientKnowledgeEnabled({ other: true })).toBe(false);
  });

  it("is enabled only when the admin flag is strictly true", () => {
    expect(isPatientKnowledgeEnabled({ [PATIENT_KNOWLEDGE_FLAG]: true })).toBe(true);
    expect(isPatientKnowledgeEnabled({ [PATIENT_KNOWLEDGE_FLAG]: "true" })).toBe(false);
    expect(isPatientKnowledgeEnabled({ [PATIENT_KNOWLEDGE_FLAG]: 1 })).toBe(false);
    expect(isPatientKnowledgeEnabled({ [PATIENT_KNOWLEDGE_FLAG]: false })).toBe(false);
  });
});
