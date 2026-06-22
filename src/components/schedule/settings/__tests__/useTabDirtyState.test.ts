import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabDirtyState } from "../useTabDirtyState";

describe("useTabDirtyState", () => {
  it("começa limpo e fica dirty ao alterar", () => {
    const { result } = renderHook(() => useTabDirtyState({ a: 1 }));
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.setValue({ a: 2 }));
    expect(result.current.isDirty).toBe(true);
  });

  it("reset(next) redefine baseline e limpa dirty", () => {
    const { result } = renderHook(() => useTabDirtyState({ a: 1 }));
    act(() => result.current.setValue({ a: 2 }));
    act(() => result.current.reset({ a: 2 }));
    expect(result.current.isDirty).toBe(false);
    expect(result.current.value).toEqual({ a: 2 });
  });

  it("voltar ao valor original zera o dirty", () => {
    const { result } = renderHook(() => useTabDirtyState({ a: 1 }));
    act(() => result.current.setValue({ a: 2 }));
    act(() => result.current.setValue({ a: 1 }));
    expect(result.current.isDirty).toBe(false);
  });
});
