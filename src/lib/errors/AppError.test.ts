import { describe, it, expect } from "vitest";
import { AppError } from "./AppError";

describe("AppError.badRequest", () => {
  it("creates an error with statusCode 400", () => {
    const err = AppError.badRequest("Invalid input");
    expect(err.statusCode).toBe(400);
  });

  it("sets isOperational to true", () => {
    const err = AppError.badRequest("Invalid input");
    expect(err.isOperational).toBe(true);
  });

  it("preserves the message", () => {
    const err = AppError.badRequest("Field is required");
    expect(err.message).toBe("Field is required");
  });

  it("uses BAD_REQUEST as default code", () => {
    const err = AppError.badRequest("oops");
    expect(err.code).toBe("BAD_REQUEST");
  });

  it("preserves context when provided", () => {
    const ctx = { field: "email", value: "not-an-email" };
    const err = AppError.badRequest("Invalid email", "BAD_REQUEST", ctx);
    expect(err.context).toEqual(ctx);
  });

  it("is an instance of AppError and Error", () => {
    const err = AppError.badRequest("bad");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("AppError.from", () => {
  it("wraps a plain Error preserving the message", () => {
    const original = new Error("something went wrong");
    const err = AppError.from(original);
    expect(err.message).toBe("something went wrong");
  });

  it("returns the same AppError instance when given an AppError", () => {
    const original = AppError.badRequest("already an AppError");
    const result = AppError.from(original);
    expect(result).toBe(original);
  });

  it("sets isOperational to true for unknown errors", () => {
    const err = AppError.from(new Error("unknown"));
    expect(err.isOperational).toBe(true);
  });

  it("preserves context object when provided", () => {
    const ctx = { operation: "PatientService.getById", id: "123" };
    const err = AppError.from(new Error("db error"), ctx);
    expect(err.context).toEqual(ctx);
  });

  it("accepts a string as context and wraps it in an object", () => {
    const err = AppError.from(new Error("oops"), "PatientService.getById");
    expect(err.context).toEqual({ context: "PatientService.getById" });
  });

  it("handles non-Error thrown values (strings)", () => {
    const err = AppError.from("something bad happened");
    expect(err.message).toBe("Erro desconhecido");
  });

  it("handles null/undefined thrown values", () => {
    const err = AppError.from(null);
    expect(err.message).toBe("Erro desconhecido");
    expect(err).toBeInstanceOf(AppError);
  });

  it("preserves isOperational from the original AppError", () => {
    const original = AppError.internal("programming error");
    expect(original.isOperational).toBe(false);
    const result = AppError.from(original);
    expect(result.isOperational).toBe(false);
  });
});
