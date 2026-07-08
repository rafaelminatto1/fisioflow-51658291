# Clinical Fast Flow Polish Design

Date: 2026-07-08

## Context

The clinical desktop flow already has strong primitives: the Agenda uses FullCalendar with optimistic appointment mutations, the appointment quick view can start attendance or evaluation, patient profile routes are available, patient context can be carried into exercises with `patientId`, and evolution already has autosave, draft recovery, conflict handling, and offline queue behavior.

The first polish pass should improve day-to-day clinical speed and operational confidence without rewriting Agenda persistence, appointment cache invalidation, evolution autosave, or exercise data storage.

## Goal

Make the Agenda quick view feel like the clinical command point for an appointment:

- reduce clicks from appointment to patient work;
- make common next actions visible in one place;
- clarify when appointment-side updates are in progress or failed;
- preserve existing route contracts and mutation behavior.

## Non-Goals

- No backend changes.
- No database or migration changes.
- No Hyperdrive, React Query key, or cache invalidation changes.
- No redesign of the full Agenda page.
- No rewrite of evolution autosave, offline sync, conflict handling, or exercise prescription internals.
- No new top-level route for a clinical room.

## User Flow

From `/agenda`, the user opens an appointment quick view. The quick view shows patient, time, status, therapist, payment, notes, package usage, and a compact clinical action area.

Primary behavior remains unchanged:

- appointments with status `avaliacao` use **Iniciar Avaliacao** and navigate to `/patients/:patientId/evaluations/new?appointmentId=:appointmentId`;
- other appointments use **Iniciar Atendimento** and navigate to `/patient-evolution/:appointmentId`.

The quick view also exposes secondary clinical shortcuts:

- **Perfil**: `/patients/:patientId`;
- **Evolucao**: `/patient-evolution/:appointmentId`;
- **Avaliacao**: `/patients/:patientId/evaluations/new?appointmentId=:appointmentId`;
- **Prescrever**: `/exercises?patientId=:patientId`;
- **WhatsApp**: `https://wa.me/55...` when phone is available.

`Prescrever` intentionally lands on the exercises library with patient context selected. It is not a new prescription builder in this pass.

## UI Design

Use the existing `AppointmentQuickView` popover/drawer as the integration point.

Add a compact action band inside the quick view, below patient identity and before mutable controls. The band should use small icon buttons with text labels on desktop and remain tappable on mobile. It should not compete visually with the existing primary CTA at the bottom.

Action hierarchy:

1. Primary CTA at the bottom: start current appointment flow.
2. Secondary action band: open related clinical destinations.
3. Utility actions: edit, delete, waitlist, WhatsApp.

Button labels must stay short and clinical: `Perfil`, `Evolucao`, `Avaliacao`, `Prescrever`, `WhatsApp`.

## Operational Feedback

Appointment-side updates should communicate local pending state:

- status update pending: disable the status select and show a subtle updating label near status;
- therapist or payment update pending: track the changed field and show the updating label next to that field;
- while the appointment update mutation is pending, avoid starting a second therapist/payment mutation from the quick view;
- failed update: restore the previous local value and show a concise toast.

Existing optimistic update protections in `useAppointmentQuickViewLogic` must remain intact. Do not add broad query resets or manual refetches from the quick view.

## Architecture

Primary files:

- `src/components/schedule/AppointmentQuickView.tsx`
- `src/components/schedule/hooks/useAppointmentQuickViewLogic.ts`

Likely implementation shape:

- Add explicit navigation helpers in `useAppointmentQuickViewLogic` for profile, evolution, evaluation, and prescription.
- Keep route prefetch for evolution and evaluation where it already exists.
- Expose `isUpdatingAppointment` and a small pending-field marker from the logic hook so the UI can show therapist/payment pending state precisely.
- Add the action band in `AppointmentQuickView`.
- Keep phone normalization local to the existing WhatsApp action.
- Map `patient_phone` from Agenda rows into `appointment.phone`; the Worker already returns this value, so no backend change is needed.

## Data Flow

No new server data is required.

Inputs come from the existing `appointment` prop:

- `appointment.id`;
- `appointment.patientId`;
- `appointment.patientName`;
- `appointment.phone`, mapped from `patient_phone` in the Agenda response when available;
- `appointment.status`;
- `appointment.payment_status`;
- `appointment.therapistId`.

Navigation uses existing React Router routes and URL parameters.

## Error Handling

For status changes, retain the existing `useAppointmentActions` behavior and local lock behavior.

For therapist and payment changes, keep the existing try/catch rollback and add user-facing failure feedback if missing. The UI should never leave the local select on a value that failed to persist.

For navigation shortcuts, do not block if prefetch fails. Navigation is the source of truth.

## Accessibility

- All shortcut buttons need text labels, not icon-only controls.
- WhatsApp action should remain unavailable or hidden when there is no phone.
- Drawer version must preserve tap targets of at least 40px height.
- Popover must keep its current dialog labeling.

## Testing

Focused validation:

- Type-check the web app.
- Run a targeted component or unit test if an existing quick view test is available.
- Run `src/utils/__tests__/cacheInvalidation.test.ts`; it is the automated anti-flicker guard that ensures Agenda invalidation keeps existing calendar data instead of clearing to a skeleton state.
- Manual verification in the Agenda:
  - open appointment quick view;
  - use profile/evolution/evaluation/prescription shortcuts;
  - change status and confirm pending/disabled behavior;
  - change therapist or payment and confirm rollback/error path remains coherent.
  - confirm these updates do not unmount the calendar or replace it with a skeleton/flicker.

## Risks

- Route aliases differ between `/patients` and `/pacientes`; use the same route patterns already used by `AppointmentQuickView` and `useAppointmentQuickViewLogic`.
- Overloading the popover can create visual noise; keep the action band compact and secondary.
- Status values are normalized in both frontend and backend; do not introduce new status values.
