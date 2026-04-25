import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAiSummarizer } from "../useAiSummarizer";

// Mock the global fetch
global.fetch = vi.fn();

describe("useAiSummarizer hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initially have loading false and summary null", () => {
    const { result } = renderHook(() => useAiSummarizer());
    expect(result.current.loading).toBe(false);
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should set summary on successful fetch", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { summary: "Resumo mockado." } }),
    });

    const { result } = renderHook(() => useAiSummarizer());

    await act(async () => {
      await result.current.summarizePatient({ name: "Paciente A" });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.summary).toBe("Resumo mockado.");
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("should set error on failed fetch", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
    });

    const { result } = renderHook(() => useAiSummarizer());

    await act(async () => {
      await result.current.summarizePatient({ name: "Paciente B" });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBe("Falha ao gerar resumo na borda (Edge AI).");
  });
});
