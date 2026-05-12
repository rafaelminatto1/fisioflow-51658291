# UI Kit — FisioFlow Clínica (Web)

Hi-fi click-thru recreation of the FisioFlow web app, the primary surface for fisioterapeutas at Activity Fisioterapia (Mooca Fisio). Built from `DESIGN_SYSTEM.md` of the source repo + screenshots of `moocafisio.com.br`.

## Files

- `index.html` — interactive prototype. Login → Agenda (week view) → Patient detail → Exercise library. Sidebar nav between screens.
- `Sidebar.jsx` — left rail with grouped nav (Atendimento · Clínica · Inteligência & IA · Gestão).
- `PageHeader.jsx` — top bar with title, contadores, ações primárias.
- `AgendaView.jsx` — week grid 6 cols × time slots, with consulta blocks.
- `PatientList.jsx` — searchable patient table with status chips.
- `ExerciseLibrary.jsx` — exercise grid cards with placeholder thumbs + meta.
- `Login.jsx` — auth screen with Activity logo lockup.
- `ui.jsx` — primitives: Button, Badge, Input, Card, Avatar.

## Screens covered

1. Login
2. Agenda (week)
3. Pacientes (list)
4. Exercícios (biblioteca)

## Run

Open `index.html` directly — uses Babel standalone for JSX. Lucide loaded from CDN.
