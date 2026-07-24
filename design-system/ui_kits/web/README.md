# UI Kit — FisioFlow Clínica (Web)

Hi-fi click-thru recreation of the FisioFlow web app, the primary surface for fisioterapeutas at Activity Fisioterapia (Mooca Fisio). Built from `DESIGN_SYSTEM.md` of the source repo + screenshots of `moocafisio.com.br`.

## Files

- `index.html` — interactive prototype. Login → Agenda (week view) → Patient detail → Exercise library. Sidebar nav between screens.
- `sidebar.jsx` — left rail with grouped nav (Atendimento · Clínica · Inteligência & IA · Gestão).
- `page-header.jsx` — top bar with title, contadores, ações primárias.
- `agenda-view.jsx` — week grid 6 cols × time slots, with consulta blocks.
- `patient-list.jsx` — searchable patient table with status chips.
- `exercise-library.jsx` — exercise grid cards with placeholder thumbs + meta.
- `login.jsx` — auth screen with Activity logo lockup.
- `ui.jsx` — primitives: Button, Badge, Input, Card, Avatar.

## Screens covered

1. Login
2. Agenda (week)
3. Pacientes (list)
4. Exercícios (biblioteca)

### Telas estáticas hi-fi (1280×880, shell compartilhado em `screen-shell.css`)

- `avaliacao-inicial.html` — anamnese / avaliação inicial
- `evolucao-clinica.html` — evolução clínica
- `crm-whatsapp.html` — CRM · WhatsApp
- `paciente-detalhe.html` — prontuário do paciente (timeline, dor, protocolo ativo)
- `protocolos.html` — biblioteca de protocolos (master-detail, fases, doses)
- `testes-clinicos.html` — biblioteca de testes ortopédicos (sens/espec, linha expandida)
- `boards.html` — kanban operacional (fluxo de pacientes)
- `financeiro.html` — faturamento (KPIs, receita, lançamentos)
- `wiki-clinica.html` — base de conhecimento interna (artigo de conduta)
- `configuracoes.html` — configurações da clínica (perfil, horários, salas)

## Run

Open `index.html` directly — uses Babel standalone for JSX. Lucide loaded from CDN.
