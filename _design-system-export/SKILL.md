---
name: fisioflow-design
description: Use this skill to generate well-branded interfaces and assets for FisioFlow (Activity Fisioterapia / Mooca Fisio), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files (`colors_and_type.css`, `assets/`, `fonts/`, `preview/`, `ui_kits/web/`, `ui_kits/patient-app/`).

Key references:
- **Tokens & foundations:** `colors_and_type.css` — drop into any HTML/CSS pipeline.
- **Brand assets:** `assets/activity-logo.svg`, `assets/activity-logo.png`, screenshots.
- **Webfont:** `fonts/vag-rounded.otf` (brand wordmark only — not for UI body).
- **Web app kit:** `ui_kits/web/index.html` + `kit.css` + JSX components (Sidebar, PageHeader, AgendaView, PatientList, ExerciseLibrary, Login).
- **Mobile patient app:** `ui_kits/patient-app/index.html`.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy `colors_and_type.css` and relevant kit files into your output and create static HTML files for the user to view. If working on production code, copy assets and read the rules in `README.md` to become an expert in designing with this brand.

Hard rules from the brand:
- **Portuguese (Brasil) only** in UI copy. `Você`, imperative CTAs, sentence case for body, Title Case for headings, UPPERCASE tracked for sidebar nav.
- **No emoji** in product UI. Iconography via `lucide-react` / lucide CDN.
- **Activity blue `#0080FF`** is sparse — primary actions, focus, active states only.
- **Neutrals dominate** (220° hue cool greys). No decorative gradients.
- **Flat cards** by default; shadow only on hover/popovers.
- **Radius 16px** base — friendly clinical.

If the user invokes this skill without other guidance, ask them what they want to build or design, ask some questions (audience, surface — web/mobile, fidelity, screens), and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
