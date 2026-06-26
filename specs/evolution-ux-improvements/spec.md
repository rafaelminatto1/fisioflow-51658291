# Feature Specification: Evolution UX/UI Upgrade

**Feature Branch**: `evolution-ux-improvements`   
**Created**: 2026-06-25   
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Responsive 3-column layout (Priority: P1)
As a physiotherapist, I want to view the complete evolution overview without horizontal scrolling on tablet screens, so that I can monitor patient progress efficiently during consultations.

**Why this priority**: 30% of clinic sessions occur on tablets, and current mobile layout forces horizontal scrolling, breaking workflow.

**Independent Test**: Resize browser window below 1024px and verify content rearranges into single column without overflow.

**Acceptance Scenarios**:
1. **Given** a patient evolution page on desktop, **When** window width drops below 1024px, **Then** layout transitions to single column with smooth animation.
2. **Given** a patient evolution page on tablet (768-1024px), **When** viewing the page, **Then** top-section cards (MedicalReturnCard, SurgeriesCard, MetasCard) display in responsive 2-column grid.
3. **Given** a patient evolution page on mobile (<768px), **When** the page loads, **Then** top-section cards display in 1-column vertical stack with adequate spacing.

---

### User Story 2 - Enhanced column 3 density (Priority: P2)
As a physiotherapist, I want clearer visual hierarchy for the pain trend and comparison cards, so that I can quickly interpret pain progression and session comparisons.

**Why this priority**: Clinical decisions often rely on interpreting pain trend visualizations quickly during sessions.

**Independent Test**: Observe column 3 layout and verify that:
- Tendency card shows clearer sparkline visualization
- vs. session comparison shows richer summary with modern badge styling
- Cards have improved contrast and spacing for scanability

**Acceptance Scenarios**:
1. **Given** a completed evolution page, **When** viewing the pain trend visualization, **Then** the sparkline uses a larger, more legible SVG with clearer axis labels.
2. **Given** a session comparison card, **When** examining the comparison badge, **Then** the badge uses enhanced border-radius and subtle shadow for depth.
3. **Given** column 3 cards, **When** viewing on desktop, **Then** cards have minimum height of 140px to prevent text truncation.

---

### User Story 3 - Enhanced EVA visualization (Priority: P2)
As a physiotherapist, I want more contextual EVA visualization that shows both current level and change from arrival, so that I can assess treatment effectiveness at a glance.

**Why this priority**: Treatment efficacy assessment requires understanding both absolute pain level and directional change.

**Independent Test**: Review EVA gauge and verify:
- Gauge shows both arrival marker and current level clearly
- Directional trend indicator is visually prominent
- Numeric values display with appropriate precision

**Acceptance Scenarios**:
1. **Given** a completed evolution page, **When** viewing the EVA component, **Then** the arrival marker appears as a distinct halo with tooltip showing exact value.
2. **Given** a pain level change, **When** the delta is non-zero, **Then** the trend indicator uses animated upward/downward icon with color coding (green for decrease, red for increase).

---

## Success Criteria

| Measurable Outcome | Target |
|--------------------|--------|
| Layout transition time on breakpoint change | < 300ms |
| Column 3 card readability score (user survey) | >= 4.5/5 |
| EVA change detection visibility | >= 90% users notice trend indicator |
| Mobile single-column usability score | >= 4.7/5 |

---

## Assumptions

- Current implementation uses `EvolutionNoScrollPanel` with CSS Grid `lg:grid-cols-[minmax(0,1fr)_minmax(380px,540px)_minmax(300px,340px)]`
- Breakpoint at `lg` (1024px) is configurable via Tailwind config
- Existing `PainGauge` component supports directional indicators but lacks visual emphasis
- `SideCard` components are reusable and can accept custom styling props
- Current layout renders all cards simultaneously; performance impact is acceptable for current dataset size

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Increased rendering complexity causing frame drops on low-end devices | Medium | High | Implement lazy loading for cards below visible area; test performance on target hardware |
| Breakage of existing desktop layout during responsive transition | Low | High | Maintain backward compatibility tests; use feature flags for new layout |
| Misinterpretation of pain trend directionality | Medium | Medium | Add tooltip explanations; conduct usability testing with clinicians |
