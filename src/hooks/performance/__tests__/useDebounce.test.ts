import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce, useDebouncedCallback, useDebounceWithPending } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the initial value", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));
    expect(result.current).toBe("initial");
  });

  it("should update the value after the specified delay", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "initial", delay: 500 },
    });

    expect(result.current).toBe("initial");

    rerender({ value: "updated", delay: 500 });

    // Value shouldn't update immediately
    expect(result.current).toBe("initial");

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("updated");
  });

  it("should clear the timeout if value changes before the delay", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "initial", delay: 500 },
    });

    rerender({ value: "updated1", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current).toBe("initial");

    rerender({ value: "updated2", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Still initial because the timer was reset
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current).toBe("updated2");
  });
});

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call the callback only after the delay", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    result.current("arg1", "arg2");

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("should reset the timer if called again before the delay", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    result.current("first");

    act(() => {
      vi.advanceTimersByTime(250);
    });

    result.current("second");

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("second");
  });
});

describe("useDebounceWithPending", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the initial state correctly", () => {
    const { result } = renderHook(() => useDebounceWithPending("initial", 500));

    expect(result.current.debouncedValue).toBe("initial");
    expect(result.current.isPending).toBe(false);
  });

  it("should update isPending when value changes and resolve after delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounceWithPending(value, delay),
      {
        initialProps: { value: "initial", delay: 500 },
      },
    );

    rerender({ value: "updated", delay: 500 });

    expect(result.current.debouncedValue).toBe("initial");
    expect(result.current.isPending).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.debouncedValue).toBe("updated");
    expect(result.current.isPending).toBe(false);
  });
});
