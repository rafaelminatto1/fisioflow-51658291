# FisioFlow Project Mandates

## 📍 Geographic Focus

- **Region:** São Paulo, Brazil.
- **Audience:** Exclusive to users and clinics in São Paulo.
- **Infrastructure:** All services (Neon, Cloudflare) must be pinned to the São Paulo region (sa-east-1 / GRU) to ensure minimum latency.

## ☁️ Infrastructure Stack

- **Cloud Provider:** 100% Cloudflare (Workers, Pages/Assets, R2, KV, Vectorize, D1, Queues, Workflows).
- **Database:** Neon PostgreSQL (AWS sa-east-1).
- **Strict Prohibition:** NEVER use Vercel or Railway for this project. Any existing references must be replaced by Cloudflare equivalents.

## 📱 Mobile Development

- **Platform:** React Native (Native, NOT Expo Go).
- **Tooling:** react-native-vision-camera, react-native-reanimated, Sentry.
- **Build Process:** Automated via GitHub Actions (generating .ipa/.apk).
- **Validation:** Manual installation via USB (iPhone 15 Pro). No Expo Go migration allowed.

## 🧠 Clinical AI Standards (AI Studio)

- **Voice:** Use `iaStudioApi` (Gemini 1.5 Flash) for Intelligent Observação Livre notes.
- **Vision:** Use verified biomechanical math utilities and real-time frame processors for Cinematic Analysis.
- **Privacy:** Strict LGPD compliance. All PII (Patient Identifiable Information) must be redacted from Cloudflare logs.

## 🔄 Resilience & Sync

- **Strategy:** Offline-first. Mappings (POST/PATCH/DELETE) must be intercepted by the API client and queued in IndexedDB (Pro) or AsyncStorage (Patient).
- **Recovery:** Automated sequential sync when connectivity is restored.

## 🏢 Clinic-Specific Constraints

- **Scope:** Single-room clinic.
- **Excluded Features:** Do NOT implement or display "Turmas/Groups" features in the Professional App. These have been hidden from the UI to maintain a focused experience for the user.
