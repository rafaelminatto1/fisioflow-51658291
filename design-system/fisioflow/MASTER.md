# Design System Master File - FisioFlow Pro Max

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** FisioFlow
**Style:** Glassmorphism Clínico & Fluxos Preditivos (Option A)
**Category:** Healthcare SaaS (High Performance)

---

## Global Rules & Constraints

### 🚫 The "Purple Ban"
- **STRICTLY PROHIBITED:** No purple, violet, pink, or magenta tones.
- **Why:** To maintain a clinical, professional, and serious atmosphere, the clinic's brand rules strictly forbid these colors.

### Color Palette

| Role | Hex | Tailwind Class | CSS Variable |
|------|-----|----------------|--------------|
| Primary (Blue) | `#2563eb` | `bg-blue-600` | `--color-primary` |
| Primary Hover | `#1d4ed8` | `bg-blue-700` | `--color-primary-hover` |
| Secondary (Emerald) | `#059669` | `bg-emerald-600` | `--color-secondary` |
| Dark/Slate | `#0f172a` | `bg-slate-900` | `--color-slate-dark` |
| Background | `#f8fafc` | `bg-slate-50` | `--color-bg-light` |
| Surface (Glass) | `rgba(255, 255, 255, 0.7)` | `bg-white/70 backdrop-blur-md` | `--color-glass` |

### Typography

- **Heading Font:** Plus Jakarta Sans or Inter
- **Body Font:** Inter
- **Mood:** Modern, clean, approachable, extremely professional.

### Glassmorphism & UI Elements

- **Glass Cards:** Use `bg-white/70 backdrop-blur-md border border-white/20` to create depth without heavy drop shadows.
- **Widget Icon:** The chat widget must strictly use the clinic's blue (`#2563eb`) as the primary action color.
- **Shadows:** Keep shadows very subtle (e.g., `shadow-sm` or `shadow-md` in Tailwind) and prefer blur over dark opacity.

---

## Clinical Workflow Enhancements

### 1. Header Quick Actions
- A top bar containing frequent actions: `+ Agendamento`, `🎙️ Evolução (SOAP)`, `📐 ADM`, `🔍 IA Spotlight`.
- Must be globally accessible from `MainLayout`.

### 2. Intelligent Preload
- Hover states on patient cards or agenda items should trigger `useIntelligentPreload` (or similar React Query / SWR fetching).
- **Goal:** Data is loaded before the user clicks, resulting in "Zero Clicks/Zero Wait" for the next screen.

---

## Pre-Delivery Checklist

- [ ] **Purple Ban Respected:** No purple/violet colors anywhere.
- [ ] **Glassmorphism:** Subdued depth using `backdrop-blur`.
- [ ] **Widget Focus:** Chat widget icon is blue and uses Cloudflare Workers AI.
- [ ] **Zero Wait Time:** Preloading hooks applied to major clinical lists.
- [ ] **Accessibility:** Contrast ratios met, and large touch targets (`44px`) for tablets.
