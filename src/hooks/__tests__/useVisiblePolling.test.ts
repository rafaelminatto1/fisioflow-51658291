import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVisiblePolling } from "../useVisiblePolling";

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useVisiblePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("chama o callback a cada intervalo quando a aba está visível", () => {
    const cb = vi.fn();
    renderHook(() => useVisiblePolling(cb, 1000));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it("NÃO chama o callback no tick quando a aba está oculta", () => {
    const cb = vi.fn();
    renderHook(() => useVisiblePolling(cb, 1000));
    act(() => setVisibility("hidden"));
    cb.mockClear();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it("chama o callback ao reabrir a aba (visibilitychange → visible)", () => {
    const cb = vi.fn();
    renderHook(() => useVisiblePolling(cb, 1000));
    act(() => setVisibility("hidden"));
    cb.mockClear();
    act(() => setVisibility("visible"));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("não agenda nada quando enabled=false", () => {
    const cb = vi.fn();
    renderHook(() => useVisiblePolling(cb, 1000, false));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(cb).not.toHaveBeenCalled();
  });
});
