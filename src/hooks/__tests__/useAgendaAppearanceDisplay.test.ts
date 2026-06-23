import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgendaAppearance } from "@/hooks/useAgendaAppearance";

beforeEach(() => localStorage.clear());

describe("useAgendaAppearance — display", () => {
  it("usa DEFAULT_DISPLAY quando não há nada salvo", () => {
    const { result } = renderHook(() => useAgendaAppearance("week"));
    expect(result.current.display).toEqual({
      showDuration: true, showType: true, showPhone: false,
      nowIndicator: true, businessHours: true, hideSunday: true,
    });
  });

  it("setDisplay faz merge parcial e persiste", () => {
    const { result } = renderHook(() => useAgendaAppearance("week"));
    act(() => result.current.setDisplay({ showPhone: true, nowIndicator: false }));
    expect(result.current.display.showPhone).toBe(true);
    expect(result.current.display.nowIndicator).toBe(false);
    expect(result.current.display.showDuration).toBe(true);
    const saved = JSON.parse(localStorage.getItem("agenda_appearance_v2")!);
    expect(saved.display.showPhone).toBe(true);
  });

  it("retrocompat: state salvo sem display retorna DEFAULT_DISPLAY", () => {
    localStorage.setItem(
      "agenda_appearance_v2",
      JSON.stringify({ global: { cardSize: "medium", heightScale: 5, fontScale: 5, opacity: 100 } }),
    );
    const { result } = renderHook(() => useAgendaAppearance("week"));
    expect(result.current.display.showDuration).toBe(true);
    expect(result.current.display.showPhone).toBe(false);
  });
});
