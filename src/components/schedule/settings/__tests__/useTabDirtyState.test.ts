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

  it("reset com updater funcional mescla e redefine baseline", () => {
    const { result } = renderHook(() => useTabDirtyState({ a: 1, b: 2 }));
    act(() => result.current.reset((prev) => ({ ...prev, b: 9 })));
    expect(result.current.value).toEqual({ a: 1, b: 9 });
    expect(result.current.isDirty).toBe(false);
  });

  it("reset() sem argumento (descartar) restaura o baseline, não mantém o draft", () => {
    const { result } = renderHook(() => useTabDirtyState({ a: 1, b: 2 }));
    act(() => result.current.setValue({ a: 5, b: 6 }));
    expect(result.current.isDirty).toBe(true);
    act(() => result.current.reset());
    expect(result.current.value).toEqual({ a: 1, b: 2 });
    expect(result.current.isDirty).toBe(false);
  });
});
