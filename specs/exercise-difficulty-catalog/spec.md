# Exercise Difficulty Catalog Specification

## User Stories

### P1 – Difficulty Audit & Validation
- **As a** system auditor,  
- **I want** to verify that every active public exercise in the production database has a non‑null `difficulty` value mapped to one of the three levels (*iniciante*, *intermediario*, *avancado*),  
- **So that** the catalog is stable and ready for downstream operations.

### P2 – Evidence‑Based Difficulty Mapping
- **As a** clinical leads team,  
- **I want** to map each exercise to a Therapeutic Edge 5‑level difficulty (L1‑L2 → *iniciante*, L3 → *intermediario*, L4‑L5 → *avancado*) using peer‑reviewed sources (APTA CPGs, PEDro, Kisner & Mobley),  
- **So that** the difficulty classification reflects clinical best practice and not just subjective assignment.

### P3 – Aggregated Catalog Endpoint
- **As a** front‑end engineer,  
- **I want** a `GET /exercises/catalog` route that returns a grouped JSON structure `{ iniciante: [...], intermediario: [...], avancado: [...] }` with counts and UI‑ready metadata,  
- **So that** the dashboard can display difficulty badges and counters.

### P4 – UI Badges & Counters
- **As a** UI designer,  
- **I want** visual badges (verde, amarelo, vermelho) and difficulty counters displayed next to the exercises grid,  
- **So that** users can instantly see distribution and filter accordingly.

### P5 – AI‑Assisted Content Enrichment
- **As a** AI engineer,  
- **I want** to run a background job that uses Cloudflare Workers AI to fill/revise missing `description`, `tips`, `precautions` fields for exercises where any of those are empty,  
- **So that** every exercise has complete, patient‑centered content.

## Acceptance Criteria
- All active public exercises have a non‑null `difficulty` set to one of the three levels.
- Difficulty mapping is documented and approved by the clinical leads.
- `GET /exercises/catalog` returns a JSON payload with accurate counts per difficulty.
- UI displays three badges with correct counts.
- AI job completes without errors and updates only missing content fields.
- All new code passes lint, type‑check, and unit tests.

## Constitution Check
- ✅ All user stories are scoped to a single coherent feature.  
- ✅ Acceptance criteria are measurable and tied to observable artifacts (JSON payload, UI elements, logs).  
- ✅ No hidden dependencies; all required tools are listed in the skill set.  
- ✅ No destructive operations planned until after explicit approval.