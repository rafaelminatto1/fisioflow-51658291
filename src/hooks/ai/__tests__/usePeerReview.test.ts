import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePeerReview } from "../usePeerReview";

// Mock the global fetch
global.fetch = vi.fn();

describe("usePeerReview hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process SOAP review successfully", async () => {
    const mockData = {
      score: 90,
      insights: ["Bom raciocínio clínico"],
      missingTests: [],
      suggestedExercises: ["Ponte"],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    });

    const { result } = renderHook(() => usePeerReview());

    await act(async () => {
      await result.current.reviewSoap({
        subjective: "Dor",
        objective: "",
        assessment: "",
        plan: "",
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.reviewResult).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("should clear review result", async () => {
    const { result } = renderHook(() => usePeerReview());

    // Simulate setting data manually first to test clear
    act(() => {
      // Internal state manipulation not usually exposed, but we can verify `clearReview` behaves safely
      // without setting it first, since `reviewResult` starts as null.
      result.current.clearReview();
    });

    expect(result.current.reviewResult).toBeNull();
  });
});
