import { useState, useCallback, useEffect, useMemo } from \"react\";
import { useAuth } from \"@neondatabase/auth\";
import { AgendaView, AgendaViewAppearance, AgendaViewSettings } from \"@/types/agenda\";
import { useAgendaAppearancePersistence } from \"./useAgendaAppearancePersistence\";

/**
 * DEFAULT_GLOBAL
 * Configurações que servem de fallback para qualquer view.
 */
const DEFAULT_GLOBAL: AgendaViewAppearance = {
  cardSize: \"medium\",
  heightScale: 1, // 0..10 -> mapeia para pixels via slotHeightPxFromScale
  fontScale: 5,   // 1..10 -> mapeia para porcentagem (ex: 80% .. 120%)
  opacity: 100,   // 0..100
};

/**
 * VIEW_DEFAULT_OVERRIDES
 * Configurações específicas para cada tipo de visualização.
 */
const VIEW_DEFAULT_OVERRIDES: Record<AgendaView, Partial<AgendaViewAppearance>> = {
  // Dia: Ajustado para caber 07h-21h em telas padrão (~600px de área útil)
  day: { cardSize: \"medium\", heightScale: 2, fontScale: 5 },
  // Semana: Mais compacto para evitar scroll lateral e vertical
  week: { cardSize: \"small\", heightScale: 1, fontScale: 4 },
  // Mês: Visual de pílulas
  month: { cardSize: \"extra_small\", heightScale: 1, fontScale: 4 },
};

export type AppearanceActions = {
  setGlobalAppearance: (appearance: Partial<AgendaViewAppearance>) => void;
  setViewAppearance: (view: AgendaView, appearance: Partial<AgendaViewAppearance>) => void;
  resetToDefault: () => void;
};

/**
 * useAgendaAppearance
 * Gerencia o estado de aparência da agenda (tamanhos, cores, opacidade).
 * Sincroniza com o backend via useAgendaAppearancePersistence.
 */
export function useAgendaAppearance(view: AgendaView) {
  const { 
    appearance: persistedAppearance, 
    updateAppearance: saveAppearance,
    isLoading 
  } = useAgendaAppearancePersistence(view);

  // Estado local para feedback imediato (optimistic)
  const [localState, setLocalState] = useState<AgendaViewSettings | null>(null);

  // Sincroniza estado local quando o persistido carregar
  useEffect(() => {
    if (persistedAppearance && !localState) {
      setLocalState(persistedAppearance);
    }
  }, [persistedAppearance, localState]);

  // Merge das configurações: Global < View Override < User Persistence < Local Optimistic
  const state = useMemo(() => {
    const base = localState || persistedAppearance || { global: DEFAULT_GLOBAL, overrides: {} };
    const global = { ...DEFAULT_GLOBAL, ...base.global };
    const overrides = base.overrides || {};
    
    return { global, overrides };
  }, [localState, persistedAppearance]);

  /**
   * getEffectiveAppearance
   * Retorna a aparência final para a view atual considerando a hierarquia.
   */
  const effectiveForView = useMemo(() => {
    const userOverride = state.overrides[view] || {};
    const presetForView = userOverride && Object.keys(userOverride).length > 0
      ? {}
      : VIEW_DEFAULT_OVERRIDES[view];

    return {
      ...state.global,
      ...presetForView,
      ...userOverride,
    };
  }, [state, view]);

  const updateGlobal = useCallback((patch: Partial<AgendaViewAppearance>) => {
    setLocalState(prev => {
      const current = prev || persistedAppearance || { global: DEFAULT_GLOBAL, overrides: {} };
      const newState = {
        ...current,
        global: { ...current.global, ...patch }
      };
      saveAppearance(newState);
      return newState;
    });
  }, [persistedAppearance, saveAppearance]);

  const updateView = useCallback((v: AgendaView, patch: Partial<AgendaViewAppearance>) => {
    setLocalState(prev => {
      const current = prev || persistedAppearance || { global: DEFAULT_GLOBAL, overrides: {} };
      const newState = {
        ...current,
        overrides: {
          ...current.overrides,
          [v]: { ...(current.overrides[v] || {}), ...patch }
        }
      };
      saveAppearance(newState);
      return newState;
    });
  }, [persistedAppearance, saveAppearance]);

  const reset = useCallback(() => {
    const newState = { global: DEFAULT_GLOBAL, overrides: {} };
    setLocalState(newState);
    saveAppearance(newState);
  }, [saveAppearance]);

  // Helpers de CSS Variables
  const slotHeightPx = slotHeightPxFromScale(effectiveForView.heightScale);
  const fontPercentage = 80 + (effectiveForView.fontScale - 1) * 5; // 1->80%, 5->100%, 10->125%

  const cssVariables = useMemo(() => {
    return {
      \"--agenda-card-opacity\": `${effectiveForView.opacity / 100}`,
      \"--agenda-slot-height\": `${slotHeightPx}px`,
      \"--agenda-font-scale\": `${fontPercentage / 100}`,
      // Injeta também variáveis padrão do FullCalendar se necessário
      \"--fc-timegrid-slot-height\": `${slotHeightPx}px`,
    } as React.CSSProperties;
  }, [effectiveForView, slotHeightPx, fontPercentage]);

  return {
    ...effectiveForView,
    slotHeightPx,
    fontPercentage,
    cssVariables,
    setGlobalAppearance: updateGlobal,
    setViewAppearance: updateView,
    resetToDefault: reset,
    isLoading
  };
}

/**
 * slotHeightPxFromScale
 * Converte a escala de 0-10 para pixels.
 */
function slotHeightPxFromScale(scale: number): number {
  // Ajustado para permitir maior compressão
  // 0 -> 4px (Ultra-compacto)
  // 2 -> 12px (Compacto - cabe tudo sem scroll)
  // 5 -> 24px (Padrão)
  // 10 -> 60px (Espaçoso)
  if (scale <= 0) return 4;
  const multiplier = 0.16 + (clamp(scale, 0, 10) / 10) * 2.34; // 0.16x (4px) .. 2.5x (60px)
  return Math.round(24 * multiplier);
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}
