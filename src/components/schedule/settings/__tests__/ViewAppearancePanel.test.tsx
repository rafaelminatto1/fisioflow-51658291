/**
 * Property-based tests for ViewAppearancePanel — pure logic from useAgendaAppearance
 *
 * Tests the pure functions extracted from useAgendaAppearance.ts:
 * - effectiveForView (Properties 1, 2, 3)
 * - hasOverrideForView logic (Property 4)
 * - CSS vars computation (Property 5)
 *
 * Note: We test the pure logic, not the React hook itself.
 */

// Feature: agenda-settings-ux-redesign, Property 1: Isolamento de override por view
// Feature: agenda-settings-ux-redesign, Property 2: Propagação de applyToAllViews
// Feature: agenda-settings-ux-redesign, Property 3: Reset de view reverte para defaults
// Feature: agenda-settings-ux-redesign, Property 4: hasOverrideForView reflete estado real
// Feature: agenda-settings-ux-redesign, Property 5: Pré-visualização reflete configuração

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeCssVars } from "@/components/schedule/settings/LiveViewPreview";

// ─── Pure logic extracted from useAgendaAppearance ───────────────────────────
// We replicate the pure functions here to test them without React hooks.

type CardSize = "extra_small" | "small" | "medium" | "large";
type AgendaView = "day" | "week" | "month";

interface AgendaViewAppearance {
  cardSize: CardSize;
  heightScale: number;
  fontScale: number;
  opacity: number;
}

interface AgendaAppearanceState {
  day?: Partial<AgendaViewAppearance>;
  week?: Partial<AgendaViewAppearance>;
  month?: Partial<AgendaViewAppearance>;
  global: AgendaViewAppearance;
}

const DEFAULT_GLOBAL: AgendaViewAppearance = {
  cardSize: "small",
  heightScale: 6,
  fontScale: 5,
  opacity: 100,
};

const VIEW_DEFAULT_OVERRIDES: Record<AgendaView, Partial<AgendaViewAppearance>> = {
  day: { cardSize: "medium", heightScale: 7, fontScale: 6 },
  week: { cardSize: "small", heightScale: 5, fontScale: 5 },
  month: { cardSize: "extra_small", heightScale: 3, fontScale: 4 },
};

function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function effectiveForView(state: AgendaAppearanceState, view: AgendaView): AgendaViewAppearance {
  const userOverride = state[view] ?? {};
  const presetForView =
    userOverride && Object.keys(userOverride).length > 0 ? {} : VIEW_DEFAULT_OVERRIDES[view];
  return {
    ...state.global,
    ...presetForView,
    ...userOverride,
  };
}

function updateView(
  state: AgendaAppearanceState,
  view: AgendaView,
  patch: Partial<AgendaViewAppearance>,
): AgendaAppearanceState {
  const current = state[view] ?? {};
  return {
    ...state,
    [view]: { ...current, ...patch },
  };
}

function applyToAllViews(
  state: AgendaAppearanceState,
  patch: Partial<AgendaViewAppearance>,
): AgendaAppearanceState {
  return {
    ...state,
    day: { ...(state.day ?? {}), ...patch },
    week: { ...(state.week ?? {}), ...patch },
    month: { ...(state.month ?? {}), ...patch },
  };
}

function resetView(state: AgendaAppearanceState, view: AgendaView): AgendaAppearanceState {
  const next: AgendaAppearanceState = { ...state };
  delete next[view];
  return next;
}

function hasOverrideForView(state: AgendaAppearanceState, view: AgendaView): boolean {
  return !!state[view] && Object.keys(state[view] as object).length > 0;
}

// ─── Generators ──────────────────────────────────────────────────────────────

const fcCardSize = fc.constantFrom<CardSize>(
  "extra_small",
  "small",
  "medium",
  "large",
);

const fcView = fc.constantFrom<AgendaView>("day", "week", "month");

const fcViewAppearance = fc.record({
  cardSize: fcCardSize,
  heightScale: fc.integer({ min: 0, max: 10 }),
  fontScale: fc.integer({ min: 0, max: 10 }),
  opacity: fc.integer({ min: 0, max: 100 }),
});

const fcPartialViewAppearance = fc.record(
  {
    cardSize: fcCardSize,
    heightScale: fc.integer({ min: 0, max: 10 }),
    fontScale: fc.integer({ min: 0, max: 10 }),
    opacity: fc.integer({ min: 0, max: 100 }),
  },
  { requiredKeys: [] },
);

const fcNonEmptyPartialViewAppearance = fc
  .record(
    {
      cardSize: fcCardSize,
      heightScale: fc.integer({ min: 0, max: 10 }),
      fontScale: fc.integer({ min: 0, max: 10 }),
      opacity: fc.integer({ min: 0, max: 100 }),
    },
    { requiredKeys: [] },
  )
  .filter((p) => Object.keys(p).length > 0);

const fcAppearanceState = fc.record({
  global: fcViewAppearance,
  day: fc.option(fcPartialViewAppearance, { nil: undefined }),
  week: fc.option(fcPartialViewAppearance, { nil: undefined }),
  month: fc.option(fcPartialViewAppearance, { nil: undefined }),
});

// ─── Property 1: Isolamento de override por view ──────────────────────────────

describe("Property 1: Isolamento de override por view", () => {
  // Feature: agenda-settings-ux-redesign, Property 1: Isolamento de override por view
  // Validates: Requirements 1.2, 1.3, 1.4, 1.5

  it("atualizar heightScale de uma view não afeta as outras duas views", () => {
    fc.assert(
      fc.property(
        fcAppearanceState,
        fcView,
        fc.integer({ min: 0, max: 10 }),
        (state, view, newHeightScale) => {
          const otherViews = (["day", "week", "month"] as AgendaView[]).filter((v) => v !== view);
          const prevOtherOverrides = otherViews.map((v) => state[v]);

          const newState = updateView(state, view, { heightScale: clamp(newHeightScale, 0, 10) });

          // Other views' overrides must be unchanged
          for (let i = 0; i < otherViews.length; i++) {
            expect(newState[otherViews[i]]).toEqual(prevOtherOverrides[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("atualizar fontScale de uma view não afeta as outras duas views", () => {
    fc.assert(
      fc.property(
        fcAppearanceState,
        fcView,
        fc.integer({ min: 0, max: 10 }),
        (state, view, newFontScale) => {
          const otherViews = (["day", "week", "month"] as AgendaView[]).filter((v) => v !== view);
          const prevOtherOverrides = otherViews.map((v) => state[v]);

          const newState = updateView(state, view, { fontScale: clamp(newFontScale, 0, 10) });

          for (let i = 0; i < otherViews.length; i++) {
            expect(newState[otherViews[i]]).toEqual(prevOtherOverrides[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("atualizar cardSize de uma view não afeta as outras duas views", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcView, fcCardSize, (state, view, newCardSize) => {
        const otherViews = (["day", "week", "month"] as AgendaView[]).filter((v) => v !== view);
        const prevOtherOverrides = otherViews.map((v) => state[v]);

        const newState = updateView(state, view, { cardSize: newCardSize });

        for (let i = 0; i < otherViews.length; i++) {
          expect(newState[otherViews[i]]).toEqual(prevOtherOverrides[i]);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("atualizar opacity de uma view não afeta as outras duas views", () => {
    fc.assert(
      fc.property(
        fcAppearanceState,
        fcView,
        fc.integer({ min: 0, max: 100 }),
        (state, view, newOpacity) => {
          const otherViews = (["day", "week", "month"] as AgendaView[]).filter((v) => v !== view);
          const prevOtherOverrides = otherViews.map((v) => state[v]);

          const newState = updateView(state, view, { opacity: clamp(newOpacity, 0, 100) });

          for (let i = 0; i < otherViews.length; i++) {
            expect(newState[otherViews[i]]).toEqual(prevOtherOverrides[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("atualizar múltiplos campos de uma view não afeta o global", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcView, fcNonEmptyPartialViewAppearance, (state, view, patch) => {
        const prevGlobal = state.global;
        const newState = updateView(state, view, patch);

        // Global must be unchanged
        expect(newState.global).toEqual(prevGlobal);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 2: Propagação de applyToAllViews ────────────────────────────────

describe("Property 2: Propagação de applyToAllViews", () => {
  // Feature: agenda-settings-ux-redesign, Property 2: Propagação de applyToAllViews
  // Validates: Requirements 1.7, 1.10

  it("applyToAllViews deve resultar em day, week e month com os valores do patch", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcNonEmptyPartialViewAppearance, (state, patch) => {
        const newState = applyToAllViews(state, patch);

        // All three views must have the patch values
        for (const view of ["day", "week", "month"] as AgendaView[]) {
          const viewOverride = newState[view];
          expect(viewOverride).toBeDefined();
          for (const [key, value] of Object.entries(patch)) {
            expect((viewOverride as Record<string, unknown>)[key]).toBe(value);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("applyToAllViews preserva campos existentes não incluídos no patch", () => {
    fc.assert(
      fc.property(
        fcAppearanceState,
        // Patch with only heightScale
        fc.record({ heightScale: fc.integer({ min: 0, max: 10 }) }),
        (state, patch) => {
          // Set up initial state with cardSize overrides
          const stateWithOverrides: AgendaAppearanceState = {
            ...state,
            day: { ...(state.day ?? {}), cardSize: "large" },
            week: { ...(state.week ?? {}), cardSize: "small" },
            month: { ...(state.month ?? {}), cardSize: "extra_small" },
          };

          const newState = applyToAllViews(stateWithOverrides, patch);

          // heightScale must be updated
          expect(newState.day?.heightScale).toBe(patch.heightScale);
          expect(newState.week?.heightScale).toBe(patch.heightScale);
          expect(newState.month?.heightScale).toBe(patch.heightScale);

          // cardSize must be preserved
          expect(newState.day?.cardSize).toBe("large");
          expect(newState.week?.cardSize).toBe("small");
          expect(newState.month?.cardSize).toBe("extra_small");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("applyToAllViews não afeta o global", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcNonEmptyPartialViewAppearance, (state, patch) => {
        const prevGlobal = state.global;
        const newState = applyToAllViews(state, patch);

        expect(newState.global).toEqual(prevGlobal);
      }),
      { numRuns: 100 },
    );
  });

  it("applyToAllViews com patch completo faz effectiveForView retornar os valores do patch", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcViewAppearance, (state, fullPatch) => {
        const newState = applyToAllViews(state, fullPatch);

        for (const view of ["day", "week", "month"] as AgendaView[]) {
          const effective = effectiveForView(newState, view);
          expect(effective.cardSize).toBe(fullPatch.cardSize);
          expect(effective.heightScale).toBe(fullPatch.heightScale);
          expect(effective.fontScale).toBe(fullPatch.fontScale);
          expect(effective.opacity).toBe(fullPatch.opacity);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Reset de view reverte para defaults ─────────────────────────

describe("Property 3: Reset de view reverte para defaults", () => {
  // Feature: agenda-settings-ux-redesign, Property 3: Reset de view reverte para defaults
  // Validates: Requirements 1.8

  it("resetView deve fazer effectiveForView retornar { ...DEFAULT_GLOBAL, ...VIEW_DEFAULT_OVERRIDES[V] }", () => {
    fc.assert(
      fc.property(
        // State with non-empty overrides for the view being reset
        fc.record({
          global: fcViewAppearance,
          day: fc.option(fcNonEmptyPartialViewAppearance, { nil: undefined }),
          week: fc.option(fcNonEmptyPartialViewAppearance, { nil: undefined }),
          month: fc.option(fcNonEmptyPartialViewAppearance, { nil: undefined }),
        }),
        fcView,
        (state, view) => {
          // Apply some override to the view first
          const stateWithOverride = updateView(state, view, {
            heightScale: 3,
            fontScale: 7,
            cardSize: "large",
          });

          // Reset the view
          const resetState = resetView(stateWithOverride, view);

          // effectiveForView must equal { ...global, ...VIEW_DEFAULT_OVERRIDES[view] }
          const effective = effectiveForView(resetState, view);
          const expected = {
            ...resetState.global,
            ...VIEW_DEFAULT_OVERRIDES[view],
          };

          expect(effective).toEqual(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("resetView remove o override da view do estado", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcView, (state, view) => {
        // Ensure the view has an override
        const stateWithOverride = updateView(state, view, { heightScale: 5 });

        const resetState = resetView(stateWithOverride, view);

        // The view override must be removed (undefined)
        expect(resetState[view]).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("resetView não afeta as outras views", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcView, (state, view) => {
        const otherViews = (["day", "week", "month"] as AgendaView[]).filter((v) => v !== view);
        const prevOtherOverrides = otherViews.map((v) => state[v]);

        const resetState = resetView(state, view);

        for (let i = 0; i < otherViews.length; i++) {
          expect(resetState[otherViews[i]]).toEqual(prevOtherOverrides[i]);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("resetView não afeta o global", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcView, (state, view) => {
        const prevGlobal = state.global;
        const resetState = resetView(state, view);

        expect(resetState.global).toEqual(prevGlobal);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 4: hasOverrideForView reflete estado real ──────────────────────

describe("Property 4: hasOverrideForView reflete estado real", () => {
  // Feature: agenda-settings-ux-redesign, Property 4: hasOverrideForView reflete estado real
  // Validates: Requirements 1.9

  it("hasOverrideForView é true se e somente se state[view] existe e tem pelo menos uma chave", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcView, (state, view) => {
        const result = hasOverrideForView(state, view);
        const viewOverride = state[view];
        const expected =
          viewOverride !== undefined &&
          viewOverride !== null &&
          Object.keys(viewOverride).length > 0;

        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("hasOverrideForView é false quando state[view] é undefined", () => {
    fc.assert(
      fc.property(fcView, (view) => {
        const state: AgendaAppearanceState = {
          global: DEFAULT_GLOBAL,
          // No per-view overrides
        };

        expect(hasOverrideForView(state, view)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("hasOverrideForView é false quando state[view] é objeto vazio", () => {
    fc.assert(
      fc.property(fcView, (view) => {
        const state: AgendaAppearanceState = {
          global: DEFAULT_GLOBAL,
          [view]: {},
        };

        expect(hasOverrideForView(state, view)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("hasOverrideForView é true após updateView com qualquer patch não-vazio", () => {
    fc.assert(
      fc.property(
        fc.record({ global: fcViewAppearance }),
        fcView,
        fcNonEmptyPartialViewAppearance,
        (baseState, view, patch) => {
          const state: AgendaAppearanceState = { ...baseState };
          const newState = updateView(state, view, patch);

          expect(hasOverrideForView(newState, view)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("hasOverrideForView é false após resetView", () => {
    fc.assert(
      fc.property(fcAppearanceState, fcView, (state, view) => {
        // First ensure there's an override
        const stateWithOverride = updateView(state, view, { heightScale: 5 });
        expect(hasOverrideForView(stateWithOverride, view)).toBe(true);

        // After reset, must be false
        const resetState = resetView(stateWithOverride, view);
        expect(hasOverrideForView(resetState, view)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("hasOverrideForView para uma view não é afetado por mudanças em outras views", () => {
    fc.assert(
      fc.property(
        fcAppearanceState,
        fcView,
        fcNonEmptyPartialViewAppearance,
        (state, view, patch) => {
          const otherViews = (["day", "week", "month"] as AgendaView[]).filter((v) => v !== view);

          for (const otherView of otherViews) {
            const prevHasOverride = hasOverrideForView(state, view);
            const newState = updateView(state, otherView, patch);
            const newHasOverride = hasOverrideForView(newState, view);

            expect(newHasOverride).toBe(prevHasOverride);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: Pré-visualização reflete configuração ───────────────────────

describe("Property 5: Pré-visualização reflete configuração", () => {
  // Feature: agenda-settings-ux-redesign, Property 5: Pré-visualização reflete configuração
  // Validates: Requirements 1.6, 4.8

  it("--agenda-card-font-scale deve ser 80 + (fontScale/10)*70 %", () => {
    fc.assert(
      fc.property(fcViewAppearance, (appearance) => {
        const { fontPercentage } = computeCssVars(appearance);
        const expected = 80 + (appearance.fontScale / 10) * 70;

        expect(fontPercentage).toBeCloseTo(expected, 10);
      }),
      { numRuns: 100 },
    );
  });

  it("--agenda-slot-height deve ser round(24 * (0.5 + (heightScale/10)*1.5)) px", () => {
    fc.assert(
      fc.property(fcViewAppearance, (appearance) => {
        const { slotHeightPx } = computeCssVars(appearance);
        const expected = Math.round(24 * (0.5 + (appearance.heightScale / 10) * 1.5));

        expect(slotHeightPx).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("--agenda-card-opacity deve ser opacity/100", () => {
    fc.assert(
      fc.property(fcViewAppearance, (appearance) => {
        const { opacityValue } = computeCssVars(appearance);
        const expected = appearance.opacity / 100;

        expect(opacityValue).toBeCloseTo(expected, 10);
      }),
      { numRuns: 100 },
    );
  });

  it("fontScale=0 deve resultar em fontPercentage=80%", () => {
    fc.assert(
      fc.property(fcViewAppearance, (appearance) => {
        const { fontPercentage } = computeCssVars({ ...appearance, fontScale: 0 });
        expect(fontPercentage).toBeCloseTo(80, 10);
      }),
      { numRuns: 100 },
    );
  });

  it("fontScale=10 deve resultar em fontPercentage=150%", () => {
    fc.assert(
      fc.property(fcViewAppearance, (appearance) => {
        const { fontPercentage } = computeCssVars({ ...appearance, fontScale: 10 });
        expect(fontPercentage).toBeCloseTo(150, 10);
      }),
      { numRuns: 100 },
    );
  });

  it("heightScale=0 deve resultar em slotHeightPx=12px", () => {
    fc.assert(
      fc.property(fcViewAppearance, (appearance) => {
        const { slotHeightPx } = computeCssVars({ ...appearance, heightScale: 0 });
        expect(slotHeightPx).toBe(12);
      }),
      { numRuns: 100 },
    );
  });

  it("heightScale=10 deve resultar em slotHeightPx=48px", () => {
    fc.assert(
      fc.property(fcViewAppearance, (appearance) => {
        const { slotHeightPx } = computeCssVars({ ...appearance, heightScale: 10 });
        expect(slotHeightPx).toBe(48);
      }),
      { numRuns: 100 },
    );
  });

  it("opacity=0 deve resultar em opacityValue=0", () => {
    fc.assert(
      fc.property(fcViewAppearance, (appearance) => {
        const { opacityValue } = computeCssVars({ ...appearance, opacity: 0 });
        expect(opacityValue).toBeCloseTo(0, 10);
      }),
      { numRuns: 100 },
    );
  });

  it("opacity=100 deve resultar em opacityValue=1", () => {
    fc.assert(
      fc.property(fcViewAppearance, (appearance) => {
        const { opacityValue } = computeCssVars({ ...appearance, opacity: 100 });
        expect(opacityValue).toBeCloseTo(1, 10);
      }),
      { numRuns: 100 },
    );
  });

  it("CSS vars são monotonicamente crescentes com seus respectivos scales", () => {
    fc.assert(
      fc.property(
        fcViewAppearance,
        fc.integer({ min: 0, max: 9 }),
        (appearance, lowerScale) => {
          const higherScale = lowerScale + 1;

          const lower = computeCssVars({ ...appearance, fontScale: lowerScale });
          const higher = computeCssVars({ ...appearance, fontScale: higherScale });

          // Higher fontScale → higher fontPercentage
          expect(higher.fontPercentage).toBeGreaterThan(lower.fontPercentage);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("slotHeightPx é monotonicamente crescente com heightScale", () => {
    fc.assert(
      fc.property(
        fcViewAppearance,
        fc.integer({ min: 0, max: 9 }),
        (appearance, lowerScale) => {
          const higherScale = lowerScale + 1;

          const lower = computeCssVars({ ...appearance, heightScale: lowerScale });
          const higher = computeCssVars({ ...appearance, heightScale: higherScale });

          // Higher heightScale → higher or equal slotHeightPx (due to rounding)
          expect(higher.slotHeightPx).toBeGreaterThanOrEqual(lower.slotHeightPx);
        },
      ),
      { numRuns: 100 },
    );
  });
});
