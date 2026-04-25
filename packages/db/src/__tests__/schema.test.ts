import { describe, it, expect } from "vitest";
import * as schema from "../index";

describe("Drizzle Schema Integrity", () => {
  const tables = Object.entries(schema).filter(([name, obj]: [string, any]) => {
    // Drizzle tables have internal properties like '_' or can be detected by column definitions
    return (
      obj &&
      typeof obj === "object" &&
      ("_" in obj ||
        (name !== "default" &&
          Object.values(obj).some(
            (col) => col && typeof col === "object" && "columnType" in col,
          ))) &&
      !name.endsWith("Relations")
    );
  });

  it("should have at least one table exported", () => {
    expect(tables.length).toBeGreaterThan(0);
  });

  describe("Multi-tenancy isolation (organizationId)", () => {
    const exemptTables = [
      "organizations",
      "profiles", // profiles has organizationId but it's optional for some cases?
      "sessions",
    ];

    tables.forEach(([tableName, tableObj]: [string, any]) => {
      if (exemptTables.includes(tableName)) return;

      it(`table '${tableName}' should have an organizationId column`, () => {
        expect(tableObj.organizationId).toBeDefined();
      });
    });
  });

  describe("Critical Table: Patients", () => {
    const { patients } = schema;

    it("should have fullName as not null", () => {
      // @ts-ignore - access internal Drizzle column config
      expect(patients.fullName.notNull).toBe(true);
    });

    it("should have isActive as not null with default true", () => {
      // @ts-ignore
      expect(patients.isActive.notNull).toBe(true);
      // @ts-ignore
      expect(patients.isActive.default).toBe(true);
    });

    it("should have soft delete support (deletedAt)", () => {
      expect(patients.deletedAt).toBeDefined();
    });
  });

  describe("Critical Table: Appointments", () => {
    const { appointments } = schema;

    it("should have patientId and organizationId", () => {
      expect(appointments.patientId).toBeDefined();
      expect(appointments.organizationId).toBeDefined();
    });

    it("should have status", () => {
      expect(appointments.status).toBeDefined();
    });
  });
});
