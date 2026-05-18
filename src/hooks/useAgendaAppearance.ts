import { useState, useCallback, useEffect, useMemo } from "react";
import { AgendaView, AgendaViewAppearance } from "@/types/agenda";

interface AgendaAppearanceState {
  global: AgendaViewAppearance;
  day?: Partial<AgendaViewAppearance>;
  week?: Partial<AgendaViewAppearance>;
  month?: Partial<AgendaViewAppearance>;
}

const DEFAULT_GLOBAL: AgendaViewAppearance = {
  cardSize: "medium",
  heightScale: 5,
  fontScale: 5,
  opacity: 100,
};

const VIEW_DEFAULT_OVERRIDES: Record<AgendaView, Partial<AgendaViewAppearance>> = {
  day: {},
  week: {},
  month: { cardSize: "extra_small" },
};

export function useAgendaAppearance(view: AgendaView) {
  const [state, setState] = useState<AgendaAppearanceState>(() => {
    if (typeof window === "undefined") return { global: DEFAULT_GLOBAL };
    const saved = localStorage.getItem("agenda_appearance_v2");
    try {
      if (!saved || saved === "undefined") return { global: DEFAULT_GLOBAL };
      return JSON.parse(saved);
    } catch {
      return { global: DEFAULT_GLOBAL };
    }
  });

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "agenda_appearance_v2" && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const save = useCallback((newState: AgendaAppearanceState) => {
    setState(newState);
    localStorage.setItem("agenda_appearance_v2", JSON.stringify(newState));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "agenda_appearance_v2",
        newValue: JSON.stringify(newState),
      }),
    );
  }, []);

  const effectiveForView = useMemo(() => {
    const userOverride = state[view] || {};
    const hasUserOverride = Object.keys(userOverride).length > 0;
    const presetForView = hasUserOverride ? {} : VIEW_DEFAULT_OVERRIDES[view];

    return {
      ...DEFAULT_GLOBAL,
      ...state.global,
      ...presetForView,
      ...userOverride,
    };
  }, [state, view]);

  const slotHeightPx = slotHeightPxFromScale(effectiveForView.heightScale);
  const fontPercentage = 70 + (effectiveForView.fontScale - 1) * 5;

  return {
    view,
    appearance: effectiveForView,
    slotHeightPx,
    fontPercentage,
    raw: state,
    cssVariables: {
      "--agenda-card-opacity": `${effectiveForView.opacity / 100}`,
      "--agenda-slot-height": `${slotHeightPx}px`,
      "--agenda-font-scale": `${fontPercentage / 100}`,
      "--fc-timegrid-slot-height": `${slotHeightPx}px`,
    } as React.CSSProperties,
    setCardSize: (val: any) =>
      save({ ...state, [view]: { ...state[view], cardSize: val } }),
    setHeightScale: (val: number) =>
      save({ ...state, [view]: { ...state[view], heightScale: val } }),
    setFontScale: (val: number) =>
      save({ ...state, [view]: { ...state[view], fontScale: val } }),
    setOpacity: (val: number) =>
      save({ ...state, [view]: { ...state[view], opacity: val } }),
    setAll: (patch: any) => save({ ...state, [view]: { ...state[view], ...patch } }),
    applyToAllViews: (patch: any) =>
      save({
        global: { ...state.global, ...patch },
        day: {},
        week: {},
        month: {},
      }),
    resetView: () => save({ ...state, [view]: {} }),
    resetAll: () => save({ global: DEFAULT_GLOBAL, day: {}, week: {}, month: {} }),
    hasOverrideForView: !!state[view] && Object.keys(state[view] || {}).length > 0,
  };
}

export function slotHeightPxFromScale(scale: number): number {
  if (scale <= 0) return 4;
  // Scale 1 to 10. Default 5 should be ~12px to fit 7h-21h on desktop without scrolling.
  if (scale <= 5) {
    // map 1..5 to 8..12px
    return Math.round(8 + ((scale - 1) / 4) * 4);
  } else {
    // map 5..10 to 12..28px
    return Math.round(12 + ((scale - 5) / 5) * 16);
  }
}
