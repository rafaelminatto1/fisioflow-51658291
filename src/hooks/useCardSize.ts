/**
 * useCardSize - Compatibilidade reversa.
 *
 * A configuração de aparência foi migrada para `useAgendaAppearance(view)`,
 * que permite valores diferentes por visualização (day/week/month).
 *
 * Este hook continua exportado para componentes legados que não conhecem a view
 * atual (ex.: a aba de configurações antiga e a pré-visualização). Ele opera
 * sobre o perfil "day" por padrão, mas escritas se propagam por todas as views
 * via `applyToAllViews` para manter o comportamento global anterior.
 */

import { useCallback } from "react";
import type { CardSize } from "@/types/agenda";
import { useAgendaAppearance } from "./useAgendaAppearance";

export function useCardSize() {
  const {
    appearance,
    fontPercentage,
    slotHeightPx,
    cssVariables,
    applyToAllViews,
    resetAll,
  } = useAgendaAppearance("day");

  const setCardSize = useCallback(
    (size: CardSize) => applyToAllViews({ cardSize: size }),
    [applyToAllViews],
  );
  const setHeightScale = useCallback(
    (scale: number) => applyToAllViews({ heightScale: scale }),
    [applyToAllViews],
  );
  const setFontScale = useCallback(
    (scale: number) => applyToAllViews({ fontScale: scale }),
    [applyToAllViews],
  );
  const setOpacity = useCallback(
    (value: number) => applyToAllViews({ opacity: value }),
    [applyToAllViews],
  );

  const heightMultiplier = slotHeightPx / 24; // back-compat com pré-visualização

  return {
    cardSize: appearance.cardSize,
    setCardSize,
    heightScale: appearance.heightScale,
    setHeightScale,
    heightMultiplier,
    fontScale: appearance.fontScale,
    setFontScale,
    fontPercentage,
    opacity: appearance.opacity,
    setOpacity,
    resetToDefault: resetAll,
    cssVariables,
  };
}
