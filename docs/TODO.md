# 📝 FisioFlow - Unified TODO List

## 📚 Documentation Backlog

- `[x]` Unify documentation structure in root `/docs`
- `[x]` Update technical architecture to Neon/Cloudflare stack
- `[x]` Remove legacy documentation (Firebase/Supabase)
- `[x]` Update `docs/guides/setup.md` with new environment variable requirements
- `[x]` Audit all archived documents and remove redundant duplicates
- `[x]` Create a "Troubleshooting" guide for Neon Auth integration issues
- `[x]` Create a "Backup Strategy" documentation for Neon DB

## ⚙️ Backend & Database

- `[x]` Complete decommissioning of legacy Cloudflare Worker (`cloudflare-worker/fisioflow-api.ts`)
- `[x]` Verify RLS policies (organizationId checks) in Drizzle routes
- `[x]` Implement automated DB backups via Neon API script
- `[x]` Optimize Hyperdrive configuration in `wrangler.toml`

## 📱 Frontend & PWA

- `[x]` Finalize PWA fallback strategies in `MainLayout.tsx` (Offline Indicator)
- `[x]` Update Patient App to use the new Hono API endpoints
- `[x]` Test iOS/Android builds with latest Capacitor configuration
- `[x]` Ensure standard meta tags are optimized in `index.html`

## 🧪 Testing & Quality

- `[x]` Increase Playwright e2e coverage for the "Appointment Flow" (Basic/Advanced implemented)
- `[x]` Implement unit tests for Drizzle schema validations
- `[x]` Run full security scan (`security_scan.py`) after documentation cleanup

## 🌍 SEO & Marketing

- `[x]` Update landing page with 2026 feature highlights (FisioFlow 2026 Premium Design)
- `[x]` Ensure standard meta tags are present across all public routes (per SEO guidelines)

## 🤖 AI & Agentic Intelligence (Roadmap 2026)

- `[ ]` Implement Gemini 3.0 Thinking Mode in `EvolutionSummarizer`
- `[ ]` Finalize Beta of FisioAmbient Scribe (Ambient Clinical Recording)
- `[ ]` Develop Orchestrator Agent for automated scheduling and billing
- `[ ]` Integrate Structured Outputs (Zod) in all clinical analysis endpoints
- `[ ]` Launch Exercise Correction via Computer Vision (Mobile Edge AI)

---

_Last Updated: April 20, 2026_
