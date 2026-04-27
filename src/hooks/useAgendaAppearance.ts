/**
 * useAgendaAppearance - Configurações de aparência da agenda por visualização
 *
 * Permite settings independentes para cada view (day/week/month) com fallback
 * para um perfil "global" quando a view específica não tem override.
 *
 * Persistência: localStorage chave `agenda_appearance_v2`. Migra valores legados de
 * `agenda_card_size`, `agenda_card_height_multiplier`, `agenda_card_font_scale`,
 * `agenda_card_opacity` no primeiro mount.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CardSize } from "@/types/agenda";
import { DEFAULT_CARD_SIZE } from "@/lib/config/agenda";

export type AgendaView = "day" | "week" | "month";

export interface AgendaViewAppearance {
  cardSize: CardSize;
  /** 0..10 → translates to slot height in px */
  heightScale: number;
  /** 0..10 → translates to font percentage 80%–150% */
  fontScale: number;
  /** 0..100 */
  opacity: number;
}

interface AgendaAppearanceState {
  // Per-view overrides; when undefined, fallback to global
  day?: Partial<AgendaViewAppearance>;
  week?: Partial<AgendaViewAppearance>;
  month?: Partial<AgendaViewAppearance>;
  // Default applied to any view without an explicit override
  global: AgendaViewAppearance;
}

const STORAGE_KEY = "agenda_appearance_v2";

const DEFAULT_GLOBAL: AgendaViewAppearance = {
  cardSize: DEFAULT_CARD_SIZE,
  heightScale: 6,
  fontScale: 5,
  opacity: 100,
};

const VIEW_DEFAULT_OVERRIDES: Record<AgendaView, Partial<AgendaViewAppearance>> = {
  // Dia: mais espaço/legibilidade por padrão
  day: { cardSize: "medium", heightScale: 7, fontScale: 6 },
  // Semana: equilíbrio
  week: { cardSize: "small", heightScale: 5, fontScale: 5 },
  // Mês: super compacto (pílulas)
  month: { cardSize: "extra_small", heightScale: 3, fontScale: 4 },
};

const LEGACY_KEYS = {
  cardSize: "agenda_card_size",
  heightScale: "agenda_card_height_multiplier",
  fontScale: "agenda_card_font_scale",
  opacity: "agenda_card_opacity",
} as const;

function readLegacyGlobal(): AgendaViewAppearance {
  if (typeof window === "undefined") return DEFAULT_GLOBAL;
  const cs = localStorage.getItem(LEGACY_KEYS.cardSize);
  const h = localStorage.getItem(LEGACY_KEYS.heightScale);
  const f = localStorage.getItem(LEGACY_KEYS.fontScale);
  const o = localStorage.getItem(LEGACY_KEYS.opacity);
  return {
    cardSize: (cs as CardSize) || DEFAULT_GLOBAL.cardSize,
    heightScale: h !== null ? clamp(Number.parseInt(h, 10), 0, 10) : DEFAULT_GLOBAL.heightScale,
    fontScale: f !== null ? clamp(Number.parseInt(f, 10), 0, 10) : DEFAULT_GLOBAL.fontScale,
    opacity: o !== null ? clamp(Number.parseInt(o, 10), 0, 100) : DEFAULT_GLOBAL.opacity,
  };
}

function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function loadState(): AgendaAppearanceState {
  if (typeof window === "undefined") {
    return { global: DEFAULT_GLOBAL };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AgendaAppearanceState;
      if (parsed && parsed.global) return parsed;
    } catch {
      // fall through to legacy migration
    }
  }
  const legacy = readLegacyGlobal();
  return { global: legacy };
}

function persist(state: AgendaAppearanceState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function effectiveForView(state: AgendaAppearanceState, view: AgendaView): AgendaViewAppearance {
  const userOverride = state[view] ?? {};
  // Se o usuário NÃO definiu nada para a view, aplicamos defaults sensatos por view
  // por cima do global. Quando ele toca em qualquer slider, a override dele assume.
  const presetForView = userOverride && Object.keys(userOverride).length > 0
    ? {}
    : VIEW_DEFAULT_OVERRIDES[view];
  return {
    ...state.global,
    ...presetForView,
    ...userOverride,
  };
}

function fontPercentageFromScale(scale: number): number {
  return 80 + (clamp(scale, 0, 10) / 10) * 70; // 80% .. 150%
}

function slotHeightPxFromScale(scale: number): number {
  // 0 -> 12px, 5 -> 24px, 10 -> 48px (linear)
  const multiplier = 0.5 + (clamp(scale, 0, 10) / 10) * 1.5; // 0.5x .. 2.0x
  return Math.round(24 * multiplier);
}

export interface UseAgendaAppearanceResult {
  view: AgendaView;
  appearance: AgendaViewAppearance;
  fontPercentage: number;
  slotHeightPx: number;
  cssVariables: React.CSSProperties;
  setCardSize: (cardSize: CardSize) => void;
  setHeightScale: (scale: number) => void;
  setFontScale: (scale: number) => void;
  setOpacity: (value: number) => void;
  setAll: (next: Partial<AgendaViewAppearance>) => void;
  applyToAllViews: (values: Partial<AgendaViewAppearance>) => void;
  resetView: () => void;
  resetAll: () => void;
  hasOverrideForView: boolean;
  // Read-only inspection of every view (for the Aparência tab)
  raw: AgendaAppearanceState;
}

/**
 * Hook principal — quando `view` é informada, leituras/escritas afetam aquela
 * visualização. Quando omitida, opera sobre o perfil global (compatibilidade).
 */
export function useAgendaAppearance(view: AgendaView = "day"): UseAgendaAppearanceResult {
  const [state, setState] = useState<AgendaAppearanceState>(() => loadState());

  // Sync entre abas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as AgendaAppearanceState;
        if (next && next.global) setState(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persistir sempre que mudar
  useEffect(() => {
    persist(state);
  }, [state]);

  const appearance = useMemo(() => effectiveForView(state, view), [state, view]);

  const updateView = useCallback(
    (patch: Partial<AgendaViewAppearance>) => {
      setState((prev) => {
        const current = prev[view] ?? {};
        return {
          ...prev,
          [view]: { ...current, ...patch },
        };
      });
    },
    [view],
  );

  const setCardSize = useCallback((cs: CardSize) => updateView({ cardSize: cs }), [updateView]);
  const setHeightScale = useCallback(
    (s: number) => updateView({ heightScale: clamp(s, 0, 10) }),
    [updateView],
  );
  const setFontScale = useCallback(
    (s: number) => updateView({ fontScale: clamp(s, 0, 10) }),
    [updateView],
  );
  const setOpacity = useCallback(
    (s: number) => updateView({ opacity: clamp(s, 0, 100) }),
    [updateView],
  );
  const setAll = useCallback((patch: Partial<AgendaViewAppearance>) => updateView(patch), [
    updateView,
  ]);

  const applyToAllViews = useCallback((patch: Partial<AgendaViewAppearance>) => {
    setState((prev) => ({
      ...prev,
      day: { ...(prev.day ?? {}), ...patch },
      week: { ...(prev.week ?? {}), ...patch },
      month: { ...(prev.month ?? {}), ...patch },
    }));
  }, []);

  const resetView = useCallback(() => {
    setState((prev) => {
      const next: AgendaAppearanceState = { ...prev };
      delete next[view];
      return next;
    });
  }, [view]);

  const resetAll = useCallback(() => {
    setState({ global: DEFAULT_GLOBAL });
  }, []);

  const fontPercentage = fontPercentageFromScale(appearance.fontScale);
  const slotHeightPx = slotHeightPxFromScale(appearance.heightScale);

  const cssVariables = useMemo<React.CSSProperties>(
    () =>
      ({
        // Vars consumidas pelos cards de evento
        "--agenda-card-font-scale": `${fontPercentage}%`,
        "--agenda-card-opacity": `${appearance.opacity / 100}`,
        // Var consumida pelo slot do FullCalendar (timegrid) e outros locais
        "--agenda-slot-height": `${slotHeightPx}px`,
        // Override direto do FullCalendar (timegrid + daygrid) — garante propagação
        "--fc-timegrid-slot-height": `${slotHeightPx}px`,
        "--fc-daygrid-event-min-height": `${Math.round(slotHeightPx * 0.85)}px`,
      }) as React.CSSProperties,
    [fontPercentage, slotHeightPx, appearance.opacity],
  );

  const hasOverrideForView = !!state[view] && Object.keys(state[view] as object).length > 0;

  return {
    view,
    appearance,
    fontPercentage,
    slotHeightPx,
    cssVariables,
    setCardSize,
    setHeightScale,
    setFontScale,
    setOpacity,
    setAll,
    applyToAllViews,
    resetView,
    resetAll,
    hasOverrideForView,
    raw: state,
  };
}
