---
name: fisioflow-patient-portal
description: Specification reference for the planned FisioFlow patient portal. Use when designing or implementing patient self-service features such as authentication, appointments, HEP, progress, or payments.
---

# FisioFlow Patient Portal

**STATUS: NOT YET IMPLEMENTED** — This skill defines the specification for the patient-facing portal, identified as a critical competitive gap.

All Brazilian competitors (Cliniconect, Ikora, Ninsaúde, EffiClin) offer patient self-service. FisioFlow currently lacks this module.

---

## Requirements (from competitive analysis)

### Authentication

- Phone-based OTP login (WhatsApp SMS fallback)
- Magic link via email
- Link to existing patient record via CPF or phone match
- JWT session management
- Biometric login (mobile app)

### Core Features

#### 1. Appointment Management

- View upcoming appointments (date, time, therapist, type)
- Confirm/cancel appointments (with reason)
- Request reschedule
- View appointment history
- Receive real-time status updates (WebSocket)

#### 2. Exercise Programs (HEP - Home Exercise Program)

- View prescribed exercises with video/image instructions
- Mark exercises as completed
- Track adherence streak
- Report pain/discomfort per exercise
- View exercise history and progress charts

#### 3. Evolution/Progress Viewing (Read-Only)

- View SOAP evolution summaries (patient-friendly language)
- Pain progression charts (from `patient_session_metrics`)
- Goal status tracking (from `patient_goals`)
- Biomechanics assessment results

#### 4. Financial

- View outstanding bills (from `contas_financeiras`)
- Payment history
- Package status (remaining sessions from `patient_packages`)
- Download NFS-e invoices (from `nfse`)
- Online payment (Stripe integration)

#### 5. Documents

- View/download uploaded documents (from `session_attachments`)
- Upload documents (exams, referrals)
- Before/after photo gallery (file_category: before_after)

#### 6. Gamification (from existing `gamification.ts` schema)

- XP and level display (from `patient_gamification`)
- Achievement badges (from `achievements_log`)
- Daily quests (from `daily_quests`)
- Leaderboard (opt-in)

---

## Database Schema Extensions Needed

### `patient_portal_users` (new table)

```
patient_portal_users
├── id: uuid PK
├── patientId → patients.id
├── organizationId
├── phone: varchar (login identifier)
├── email: varchar (optional login)
├── passwordHash: varchar (optional, for email login)
├── otpSecret: varchar
├── magicLinkToken: varchar
├── magicLinkExpiresAt: timestamp
├── lastLoginAt: timestamp
├── biometricEnabled: boolean
├── pushToken: varchar (Expo push notifications)
├── locale: varchar default 'pt-BR'
├── isActive, deletedAt, createdAt, updatedAt
```

### `patient_exercise_logs` (new table for HEP adherence)

```
patient_exercise_logs
├── id: uuid PK
├── patientId → patients.id
├── exerciseId: uuid (lazy ref)
├── prescriptionId → exercise_prescriptions.id
├── organizationId
├── completedAt: timestamp
├── painLevel: integer (0-10)
├── difficulty: varchar (easy/medium/hard)
├── notes: text
├── side: varchar (left/right/bilateral)
├── setsCompleted, repsCompleted: integer
├── createdAt
```

---

## API Route Specification

**File:** `apps/api/src/routes/patient-portal.ts`

### Unauthenticated Routes

```
POST /api/portal/auth/otp/send     — Send OTP to patient phone
POST /api/portal/auth/otp/verify   — Verify OTP, return JWT
POST /api/portal/auth/magic-link   — Send magic link to email
GET  /api/portal/auth/magic-link/verify?token=xxx — Verify magic link
```

### Authenticated Routes (patient JWT, not staff JWT)

```
GET  /api/portal/me                — Patient profile
GET  /api/portal/appointments      — Upcoming appointments
POST /api/portal/appointments/:id/confirm   — Confirm appointment
POST /api/portal/appointments/:id/cancel    — Cancel appointment
GET  /api/portal/exercises         — Prescribed exercise programs
POST /api/portal/exercises/:id/log — Log exercise completion
GET  /api/portal/evolutions        — Evolution summaries (read-only)
GET  /api/portal/financial         — Bills and payment history
GET  /api/portal/documents         — Available documents
POST /api/portal/documents         — Upload document
GET  /api/portal/gamification      — XP, achievements, quests
```

### Auth Middleware (different from staff auth)

```ts
const requirePatientAuth = async (c, next) => {
  const token = extractBearerToken(c.req);
  const payload = verifyJWT(token, PATIENT_JWT_SECRET);
  const portalUser = await db.query.patientPortalUsers.findFirst({
    where: eq(patientPortalUsers.id, payload.sub),
  });
  c.set("patientUser", portalUser);
  c.set("patientId", portalUser.patientId);
  c.set("organizationId", portalUser.organizationId);
  await next();
};
```

---

## Frontend Specification

### Web App (shared component library)

- Route: `/portal/*` in fisioflow-web
- Minimal, mobile-first design
- Dark/light theme
- Portuguese (pt-BR) only

### Mobile App (Expo, patient app)

- Already scaffolded as `apps/patient/`
- Uses same API endpoints
- Push notifications for appointments, exercises
- Camera for document upload
- Biometric auth

---

## Integration Points

- **WhatsApp:** Deep links from WhatsApp messages to portal (e.g., `/portal/appointments/:id/confirm`)
- **Stripe:** Payment intent creation for outstanding bills
- **Gamification:** Existing schema fully supports portal gamification
- **WhatsApp Opt-in/out:** `wa_opt_in_out` tracks consent for messaging via portal
