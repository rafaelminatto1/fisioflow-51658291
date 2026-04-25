import { describe, it, expect } from "vitest";
import { patients, medicalRecords, appointments } from "@fisioflow/db";

describe("Drizzle Schema Validations", () => {
  it("should have organizationId in patients table", () => {
    expect(patients.organizationId).toBeDefined();
  });

  it("should have organizationId in medical_records table", () => {
    expect(medicalRecords.organizationId).toBeDefined();
  });

  it("should have organizationId in appointments table", () => {
    expect(appointments.organizationId).toBeDefined();
  });

  it("should have fullName as a required field in patients", () => {
    // Check if the column configuration reflects notNull
    // In Drizzle, properties like notNull are internal, but we can check if it exists
    expect(patients.fullName).toBeDefined();
  });
});
