---
name: fisioflow-lgpd
description: Practical guidance for LGPD-related technical implementation in FisioFlow. Use when working on personal or sensitive data handling, consent, audit, retention, export, or deletion flows.
---

# FisioFlow LGPD Compliance Skill

Practical implementation patterns for Lei Geral de Protecao de Dados (LGPD) compliance in the FisioFlow physiotherapy clinic system. This is NOT legal advice — it documents how the codebase enforces data protection technically.

## System Context

- **Stack**: Cloudflare Workers (Hono) + Neon PostgreSQL (Drizzle ORM) + Cloudflare R2
- **Auth**: Neon Auth (Better Auth) with JWT/JWKS verification
- **Multi-tenancy**: Every table has `organizationId` + PostgreSQL RLS policies
- **Audit**: D1 (durable) + Analytics Engine (real-time observability)

---

## 1. Data Classification

LGPD Article 5 distinguishes personal data from sensitive data. In a physiotherapy context:

### Personal Data (Article 5, I)

Stored primarily in the `patients` table (`src/server/db/schema/patients.ts`):

| Field | Column | Classification |
|---|---|---|
| Name | `fullName`, `socialName`, `nickname` | Personal |
| CPF | `cpf` | Personal (unique identifier) |
| RG | `rg` | Personal (identity document) |
| Phone | `phone`, `phoneSecondary` | Personal (contact) |
| Email | `email` | Personal (contact) |
| Address | `address` (JSONB) | Personal (location) |
| Date of birth | `legacyDateOfBirth` | Personal |
| Photo | `photoUrl` | Personal (biometric-adjacent) |

### Sensitive Health Data (Article 5, II)

Requires heightened protection. Stored across multiple tables:

| Data | Table | Fields |
|---|---|---|
| Anamnesis / medical history | `medical_records` | `medicalHistory`, `pastHistory`, `familyHistory`, `currentHistory` |
| Current medications | `medical_records` | `medications` (JSONB), `currentMedications` |
| Allergies | `medical_records` | `allergies` (JSONB) |
| Physical exam findings | `medical_records` | `physicalExam` (JSONB: ROM, muscle strength, special tests) |
| Diagnoses + CID-10 | `medical_records` | `diagnosis`, `icd10Codes` |
| SOAP session notes | `sessions` | `subjective`, `objective`, `assessment`, `plan` |
| Pathologies | `pathologies` | `name`, `icdCode`, `status`, `diagnosedAt` |
| Surgeries | `surgeries` | `name`, `surgeryDate`, `surgeon`, `hospital` |
| Biomechanics | `biomechanics` | gait analysis, joint angles |
| Session recordings | R2 (`recordings/`) | video/audio media |

### Classification Pattern for New Fields

When adding new patient-related fields, apply this decision tree:

```
Is it needed for clinical care or clinic operations?
  NO -> Do not collect (Article 6, III — data minimization)
  YES -> Does it reveal health status, treatment, or body data?
    YES -> SENSITIVE: requires consent, audit logging, encryption
    NO -> PERSONAL: standard protection, audit on access
```

---

## 2. Multi-Tenant Isolation

### Architecture

Every table in the schema includes an `organizationId` column. Tenant isolation is enforced at TWO levels:

1. **Application level**: `runWithOrg()` sets a session variable before every query
2. **Database level**: PostgreSQL Row-Level Security (RLS) policies validate the session variable

### RLS Helper (`src/server/db/schema/rls_helper.ts`)

Three policy patterns exist:

```typescript
import { pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export function withOrganizationPolicy(tableName: string, organizationIdColumn: any) {
  return pgPolicy(`policy_${tableName}_isolation`, {
    for: "all",
    to: "authenticated",
    using: sql`${organizationIdColumn} = (current_setting('app.org_id')::uuid)`,
  });
}

export function withPublicWriteOrganizationPolicy(tableName: string, organizationIdColumn: any) {
  return [
    pgPolicy(`policy_${tableName}_public_insert`, {
      for: "insert",
      to: ["authenticated", "anon"],
      withCheck: sql`true`,
    }),
    pgPolicy(`policy_${tableName}_tenant_isolation`, {
      for: "all",
      to: "authenticated",
      using: sql`${organizationIdColumn} = (current_setting('app.org_id')::uuid)`,
    }),
  ];
}

export function withPublicOrOrganizationPolicy(tableName: string, organizationIdColumn: any) {
  return pgPolicy(`policy_${tableName}_hybrid_isolation`, {
    for: "all",
    to: "authenticated",
    using: sql`(${organizationIdColumn} IS NULL) OR (${organizationIdColumn} = (current_setting('app.org_id')::uuid))`,
  });
}
```

### Applying RLS to a New Table

```typescript
import { withOrganizationPolicy } from "./rls_helper";

export const myNewTable = pgTable(
  "my_new_table",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"),
    // ... other columns
  },
  (table) => ({
    orgIdx: index("idx_my_new_table_org_id").on(table.organizationId),
  }),
  (table) => [withOrganizationPolicy("my_new_table", table.organizationId)],
);
```

### Application-Level Org Context (`apps/api/src/lib/db.ts`)

The `requireAuth` middleware in `apps/api/src/lib/auth.ts` sets the org context for every request:

```typescript
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = await verifyToken(c, c.env);
  if (!user) {
    return c.json({ error: "Nao autorizado", code: "UNAUTHORIZED" }, 401);
  }
  c.set("user", user);
  await runWithOrg(user.organizationId, () => next());
};
```

`runWithOrg` uses `AsyncLocalStorage` to propagate the `organizationId` through the call chain. Every database query then issues:

```sql
SELECT set_config('app.org_id', $1, true);
```

before the actual query inside a transaction, ensuring RLS policies apply.

### Which Policy to Use

| Pattern | Use Case | Example Tables |
|---|---|---|
| `withOrganizationPolicy` | Standard tenant data | `patients`, `sessions`, `medical_records`, `appointments` |
| `withPublicWriteOrganizationPolicy` | Public can INSERT, auth users see own org | `precadastro` (patient self-registration) |
| `withPublicOrOrganizationPolicy` | Shared global content + org-specific | `wiki`, knowledge base entries |

---

## 3. Audit Logging

### Implementation (`apps/api/src/lib/auditLog.ts`)

The system writes audit entries to TWO destinations:

1. **Cloudflare D1** — durable, queryable storage for LGPD compliance reports
2. **Cloudflare Analytics Engine** — real-time observability dashboards

### Audit Actions

```typescript
type AuditAction =
  | 'patient.view'
  | 'patient.create'
  | 'patient.update'
  | 'patient.delete'
  | 'session.create'
  | 'session.update'
  | 'session.finalize'
  | 'session.delete'
  | 'exam.upload'
  | 'exam.view'
  | 'document.sign'
  | 'document.view'
  | 'auth.login'
  | 'auth.logout'
  | 'lgpd.data_export'
  | 'lgpd.data_delete'
  | 'lgpd.consent_update'
  | 'financial.view'
  | 'financial.create';
```

### Logging Pattern in Route Handlers

```typescript
import { writeAuditLog, extractRequestContext } from "../lib/auditLog";

app.get("/patients/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("id");
  const ctx = extractRequestContext(c);

  const patient = await db.query.patients.findFirst({
    where: eq(patients.id, patientId),
  });

  writeAuditLog(c.env, {
    action: 'patient.view',
    entityId: patientId,
    entityType: 'patient',
    userId: user.uid,
    organizationId: user.organizationId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  }, c.executionCtx);

  return c.json(patient);
});
```

### D1 Table Schema

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_id TEXT,
  entity_type TEXT,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_org_action
  ON audit_log (organization_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_log (entity_id, entity_type, created_at);
```

### LGPD Compliance Query

```sql
SELECT action, entity_type, user_id, ip_address, created_at
FROM audit_log
WHERE organization_id = 'org-xxx'
  AND action LIKE 'patient.%'
  AND created_at > datetime('now', '-30 days')
ORDER BY created_at DESC;
```

### When to Log

| Action | Required | Why |
|---|---|---|
| Patient data viewed | YES | LGPD Article 37 — data access accountability |
| Patient data created/updated | YES | Traceability of clinical records |
| Patient data deleted | YES | Right to be forgotten audit trail |
| Consent changes | YES | LGPD Article 8 — proof of consent |
| Data exports | YES | LGPD Article 18 — portability requests |
| Session finalized | YES | Clinical record integrity |
| Auth events (login/logout) | Recommended | Access control auditing |

### Important: Fire-and-Forget Pattern

`writeAuditLog` never throws. It uses `ctx.waitUntil()` to avoid blocking the response:

```typescript
if (ctx) {
  ctx.waitUntil(writeToD1 instanceof Promise ? writeToD1 : Promise.resolve());
}
```

---

## 4. Data Minimization

LGPD Article 6, III: data collection must be adequate, relevant, and limited to what is necessary.

### Current Practice

The `patients` table collects only clinically relevant fields:

- **Identity**: `fullName`, `socialName`, `cpf`, `rg`, `gender`
- **Contact**: `phone`, `email`, `address` (JSONB)
- **Clinical**: `bloodType`, `weightKg`, `heightCm`
- **Emergency**: `emergencyContact` (name, phone, relationship)
- **Insurance**: `insurance` (provider, plan, card number)
- **Consent**: `consentData`, `consentImage`

### Adding New Fields: Checklist

1. Is this field required for patient care? If not, do not add it.
2. Is there a less identifying alternative? (e.g., age range instead of exact DOB)
3. Will the field be auto-deleted when no longer needed? Add to anonymization script.
4. Document the legal basis for collection (consent, contract, legitimate interest).

### Pattern: Avoid Storing Unnecessary Identifiers

```typescript
// BAD: collecting ethnicity, religion, political opinion
ethnicity: varchar("ethnicity", { length: 50 }),

// GOOD: only clinical data
bloodType: varchar("blood_type", { length: 10 }),
```

---

## 5. Consent Management

### Schema Fields

The `patients` table includes two consent booleans:

```typescript
consentData: boolean("consent_data").default(true),
consentImage: boolean("consent_image").default(false),
```

- `consentData` — patient authorizes processing of personal/health data for clinical care
- `consentImage` — patient authorizes capture and storage of images/video during sessions

### WhatsApp Opt-In/Opt-Out

The compliance service (`apps/api/src/services/compliance-service.ts`) manages a separate consent channel for WhatsApp communications:

```typescript
await recordOptIn(pool, orgId, contactId, "whatsapp", "Patient initiated conversation");
await recordOptOut(pool, orgId, contactId, "whatsapp", "Patient requested stop");
```

The `wa_opt_in_out` table records every consent change with timestamp for audit.

### Pattern: Recording Consent Changes

```typescript
app.patch("/patients/:id/consent", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("id");
  const body = await c.req.json();
  const ctx = extractRequestContext(c);

  await db.update(patients)
    .set({
      consentData: body.consentData,
      consentImage: body.consentImage,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, patientId));

  writeAuditLog(c.env, {
    action: 'lgpd.consent_update',
    entityId: patientId,
    entityType: 'patient',
    userId: user.uid,
    organizationId: user.organizationId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: {
      consentData: body.consentData,
      consentImage: body.consentImage,
    },
  }, c.executionCtx);

  return c.json({ success: true });
});
```

### Checking Consent Before Processing

```typescript
const patient = await db.query.patients.findFirst({
  where: eq(patients.id, patientId),
  columns: { consentData: true, consentImage: true },
});

if (!patient?.consentData) {
  return c.json({ error: "Patient has not consented to data processing" }, 403);
}

if (involvesImageCapture && !patient?.consentImage) {
  return c.json({ error: "Patient has not consented to image capture" }, 403);
}
```

---

## 6. Data Retention

### Recommended Retention Policy

CFM Resolution 2.145/2016 requires physiotherapy records be retained for at least **20 years** from the last appointment.

| Data Type | Retention | Legal Basis |
|---|---|---|
| Clinical records (SOAP, anamnesis) | 20 years minimum | CFM Resolution 2.145/2016 |
| Patient registration data | Duration of relationship + 20 years | Contract + regulatory |
| Session recordings (video/audio) | 5 years after last session | Clinical quality, not regulatory |
| Financial records (invoices, payments) | 5 years + current year | Tax legislation |
| Audit logs | 5 years | LGPD Article 37 |
| WhatsApp messages | Duration of relationship | Consent-based, operational |

### Implementation Pattern: Soft Delete with Retention

The schema uses soft deletes:

```typescript
deletedAt: timestamp("deleted_at"),
```

Data is marked as deleted but retained until the retention period expires. A scheduled cleanup job handles final removal:

```typescript
app.get("/cron/retention-cleanup", async (c) => {
  const cutoff20y = new Date();
  cutoff20y.setFullYear(cutoff20y.getFullYear() - 20);

  const cutoff5y = new Date();
  cutoff5y.setFullYear(cutoff5y.getFullYear() - 5);

  await db.delete(sessions)
    .where(and(
      isNotNull(sessions.deletedAt),
      lt(sessions.deletedAt, cutoff20y),
    ));

  await db.delete(auditLogs)
    .where(lt(auditLogs.createdAt, cutoff5y));

  return c.json({ success: true });
});
```

---

## 7. Right to be Forgotten (Article 18, VI)

LGPD allows patients to request data deletion, BUT health data has a legal retention requirement (CFM). The approach is **anonymization** rather than full deletion.

### Existing Pattern: WhatsApp Contact Deletion

From `apps/api/src/services/compliance-service.ts`:

```typescript
export async function deleteContactData(
  pool: Pool,
  orgId: string,
  contactId: string,
): Promise<void> {
  await pool.query("BEGIN");

  const conversationsResult = await pool.query(
    `SELECT id FROM wa_conversations WHERE contact_id = $1 AND org_id = $2`,
    [contactId, orgId],
  );
  const conversationIds = conversationsResult.rows.map((c: any) => c.id);

  if (conversationIds.length > 0) {
    await pool.query(`DELETE FROM wa_messages WHERE conversation_id = ANY($1)`, [conversationIds]);
    await pool.query(`DELETE FROM wa_assignments WHERE conversation_id = ANY($1)`, [conversationIds]);
    await pool.query(`DELETE FROM wa_sla_tracking WHERE conversation_id = ANY($1)`, [conversationIds]);
    await pool.query(`DELETE FROM wa_conversations WHERE id = ANY($1)`, [conversationIds]);
  }

  await pool.query(`DELETE FROM wa_opt_in_out WHERE contact_id = $1 AND org_id = $2`, [contactId, orgId]);
  await pool.query(`DELETE FROM wa_access_log WHERE contact_id = $1 AND org_id = $2`, [contactId, orgId]);

  await pool.query(
    `UPDATE whatsapp_contacts SET
        display_name = 'Deleted User',
        phone_e164 = NULL,
        wa_id = NULL,
        bsuid = NULL,
        username = NULL,
        parent_bsuid = NULL,
        updated_at = now()
      WHERE id = $1 AND org_id = $2`,
    [contactId, orgId],
  );

  await pool.query("COMMIT");
}
```

### Pattern: Patient Anonymization for Clinical Records

For health data that MUST be retained by law, anonymize instead of delete:

```typescript
export async function anonymizePatient(
  pool: Pool,
  orgId: string,
  patientId: string,
  requestedBy: string,
): Promise<void> {
  const anonymousId = crypto.randomUUID();

  await pool.query("BEGIN");

  await pool.query(
    `UPDATE patients SET
        full_name = 'Paciente Anonimizado',
        social_name = NULL,
        nickname = NULL,
        cpf = NULL,
        rg = NULL,
        phone = NULL,
        phone_secondary = NULL,
        email = NULL,
        photo_url = NULL,
        address = NULL,
        profession = NULL,
        emergency_contact = NULL,
        insurance = NULL,
        consent_data = false,
        consent_image = false,
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2`,
    [patientId, orgId],
  );

  await pool.query(
    `UPDATE medical_records SET
        current_medications = NULL,
        medications = '[]'::jsonb,
        allergies = '[]'::jsonb,
        lifestyle = NULL,
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE patient_id = $1 AND organization_id = $2`,
    [patientId, orgId],
  );

  await pool.query(
    `UPDATE sessions SET
        deleted_at = NOW()
      WHERE patient_id = $1 AND organization_id = $2`,
    [patientId, orgId],
  );

  await pool.query(
    `DELETE FROM exams WHERE patient_id = $1 AND organization_id = $2`,
    [patientId, orgId],
  );

  await pool.query("COMMIT");
}
```

### Data Export (Portability — Article 18, V)

From `compliance-service.ts`, `exportContactData` demonstrates the full export pattern:

```typescript
export async function exportPatientData(
  pool: Pool,
  orgId: string,
  patientId: string,
): Promise<Record<string, any>> {
  const patientResult = await pool.query(
    `SELECT * FROM patients WHERE id = $1 AND organization_id = $2`,
    [patientId, orgId],
  );

  if (patientResult.rows.length === 0) {
    return { error: "Patient not found" };
  }

  const recordsResult = await pool.query(
    `SELECT * FROM medical_records WHERE patient_id = $1 AND organization_id = $2`,
    [patientId, orgId],
  );

  const sessionsResult = await pool.query(
    `SELECT * FROM sessions WHERE patient_id = $1 AND organization_id = $2`,
    [patientId, orgId],
  );

  return {
    patient: patientResult.rows[0],
    medicalRecords: recordsResult.rows,
    sessions: sessionsResult.rows,
    exportedAt: new Date().toISOString(),
  };
}
```

---

## 8. Encryption

### In Transit

All traffic to Cloudflare Workers uses **TLS 1.3** by default. No configuration needed — Cloudflare enforces this at the edge.

### At Rest

- **Neon PostgreSQL**: AES-256 encryption at rest (managed by Neon)
- **Cloudflare R2**: AES-256 encryption at rest (managed by Cloudflare)
- **Cloudflare D1**: Encryption at rest (managed by Cloudflare)

### Media Access: Presigned URLs

R2 objects are never publicly accessible. The `R2Service` (`apps/api/src/lib/storage/R2Service.ts`) generates time-limited presigned URLs:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class R2Service {
  private client: S3Client;

  constructor(private env: Env) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async getUploadUrl(key: string, contentType = 'video/webm') {
    const command = new PutObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(),
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async getDownloadUrl(key: string, expiresIn = 86400) {
    const command = new GetObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(),
      Key: key,
    });
    return await getSignedUrl(this.client, command, { expiresIn });
  }
}
```

Upload URLs expire in **1 hour**. Download URLs expire in **24 hours** (configurable).

### Key Storage

Secrets (R2 credentials, API keys, JWT signing keys) are stored as **Cloudflare Worker Secrets** (encrypted environment variables), never in code or database.

---

## 9. Access Control (RBAC)

### Role Definitions

The system defines four primary roles stored in the `profiles` table:

| Role | Permissions Scope | Data Access |
|---|---|---|
| `admin` | Full system access | All patients, all data in org |
| `fisioterapeuta` | Clinical operations | Own patients + assigned conversations |
| `recepcionista` | Scheduling, patient intake | All patients (view), scheduling, WhatsApp inbox |
| `paciente` | Self-service portal | Own data only |

Additional role: `estagiario` (intern) — limited to assigned patients.

### RBAC Middleware Pattern

From `apps/api/src/middleware/whatsapp-rbac.ts`:

```typescript
const WHATSAPP_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "whatsapp:view_all",
    "whatsapp:send_message",
    "whatsapp:manage_templates",
    "whatsapp:assign",
    "whatsapp:manage_team",
    "whatsapp:view_clinical",
    "whatsapp:view_financial",
    "whatsapp:manage_automations",
  ],
  fisioterapeuta: [
    "whatsapp:view_assigned",
    "whatsapp:send_message",
    "whatsapp:transfer",
    "whatsapp:view_clinical",
  ],
  recepcionista: [
    "whatsapp:view_all",
    "whatsapp:send_message",
    "whatsapp:assign",
    "whatsapp:view_financial",
  ],
  estagiario: [
    "whatsapp:view_assigned",
    "whatsapp:send_message",
  ],
};

export function requireWhatsAppPermission(permission: string) {
  return async (c, next) => {
    const user = c.get("user");
    const pool = createPool(c.env);
    const profileResult = await pool.query(
      `SELECT role FROM profiles WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
      [user.uid, user.organizationId],
    );
    const role = profileResult.rows[0]?.role;
    const permissions = WHATSAPP_PERMISSIONS[role] ?? [];

    if (!permissions.includes(permission)) {
      return c.json({ error: "Insufficient permissions", code: "FORBIDDEN" }, 403);
    }
    await next();
  };
}
```

### Data Scoping by Role

```typescript
export async function getScopedConversationsFilter(pool, userId, orgId) {
  const profileResult = await pool.query(
    `SELECT id, role FROM profiles WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
    [userId, orgId],
  );

  const { id: profileId, role } = profileResult.rows[0];

  if (role === "admin") {
    return { where: "c.org_id = $1", params: [orgId] };
  }

  if (role === "fisioterapeuta" || role === "estagiario") {
    return {
      where: `c.org_id = $1 AND (c.assigned_to = $2 OR EXISTS (
        SELECT 1 FROM patients p
        JOIN whatsapp_contacts wc ON wc.patient_id = p.id
        WHERE wc.id = c.contact_id AND p.professional_id = $2
      ))`,
      params: [orgId, profileId],
    };
  }

  return { where: "1 = 0", params: [] };
}
```

### Adding a New Permission Check

```typescript
import { requireAuth } from "../lib/auth";

app.get("/patients/:id/medical-records",
  requireAuth,
  requirePermission("clinical:view_medical_records"),
  async (c) => {
    // Only fisioterapeuta and admin can access
  }
);
```

---

## 10. Incident Response

### Data Breach Response Procedure (LGPD Article 48)

The ANPD (Autoridade Nacional de Protecao de Dados) must be notified within **72 hours** of becoming aware of a data breach.

### Technical Response Checklist

1. **Detect**: Monitor audit logs for anomalies

```sql
SELECT user_id, action, count(*) as access_count
FROM audit_log
WHERE organization_id = $1
  AND created_at > datetime('now', '-1 hour')
GROUP BY user_id, action
HAVING count(*) > 100
ORDER BY access_count DESC;
```

2. **Contain**: Revoke compromised credentials immediately

```typescript
app.post("/security/revoke-sessions", requireAuth, requireRole("admin"), async (c) => {
  const { userId } = await c.req.json();
  const sql = getRawSql(c.env, "write");

  await sql(
    `DELETE FROM neon_auth.session WHERE "userId" = $1`,
    [userId],
  );

  writeAuditLog(c.env, {
    action: 'auth.logout',
    entityId: userId,
    entityType: 'user',
    userId: c.get("user").uid,
    organizationId: c.get("user").organizationId,
    metadata: { reason: "security_incident" },
  }, c.executionCtx);

  return c.json({ success: true });
});
```

3. **Assess**: Query what data was accessed

```sql
SELECT entity_type, entity_id, action, user_id, ip_address, created_at
FROM audit_log
WHERE user_id = $1
  AND created_at BETWEEN $2 AND $3
ORDER BY created_at;
```

4. **Notify**: Generate breach notification with affected patient count

```typescript
interface BreachReport {
  detectedAt: string;
  affectedPatients: string[];
  dataTypesAccessed: string[];
  containedAt: string;
  notificationRequired: boolean;
}

app.post("/security/breach-report", requireAuth, requireRole("admin"), async (c) => {
  const { suspiciousUserId, windowStart, windowEnd } = await c.req.json();

  const affectedRecords = await pool.query(
    `SELECT DISTINCT entity_id, entity_type
     FROM audit_log
     WHERE user_id = $1
       AND created_at BETWEEN $2 AND $3
       AND entity_type IN ('patient', 'session', 'medical_record')`,
    [suspiciousUserId, windowStart, windowEnd],
  );

  const patientIds = affectedRecords.rows
    .filter((r: any) => r.entity_type === "patient")
    .map((r: any) => r.entity_id);

  const report: BreachReport = {
    detectedAt: new Date().toISOString(),
    affectedPatients: patientIds,
    dataTypesAccessed: [...new Set(affectedRecords.rows.map((r: any) => r.entity_type))],
    containedAt: new Date().toISOString(),
    notificationRequired: patientIds.length > 0,
  };

  writeAuditLog(c.env, {
    action: 'lgpd.data_export',
    entityType: 'breach_report',
    userId: c.get("user").uid,
    organizationId: c.get("user").organizationId,
    metadata: report,
  }, c.executionCtx);

  return c.json(report);
});
```

5. **Rotate**: Rotate all credentials exposed in the breach

```bash
# Rotate R2 credentials via Cloudflare dashboard
# Rotate NEON_AUTH_JWKS_URL if JWT keys compromised
# Rotate all API keys stored as Worker secrets
```

6. **Document**: Keep all breach records for 5 years (LGPD Article 37)

### Cloudflare-Level Protections

These are already in place and require no additional code:

- **WAF**: Cloudflare Web Application Firewall blocks SQL injection, XSS, and common attack patterns
- **DDoS Protection**: Automatic mitigation of volumetric attacks
- **Rate Limiting**: Middleware in `apps/api/src/middleware/rateLimit.ts`
- **Bot Protection**: Cloudflare Turnstile on public routes (`apps/api/src/middleware/turnstile.ts`)
- **Secure Headers**: Applied via `hono/secure-headers` middleware

---

## Quick Reference: Adding a New LGPD-Sensitive Feature

1. **Add `organizationId` column** to the new table
2. **Apply `withOrganizationPolicy`** RLS policy
3. **Add audit actions** to the `AuditAction` type
4. **Call `writeAuditLog`** on every create/read/update/delete
5. **Check consent** before processing sensitive data
6. **Add anonymization logic** to the cleanup/anonymization service
7. **Verify RBAC** — use `requirePermission()` or `requireRole()` middleware
8. **Use presigned URLs** for any new media storage (never expose R2 publicly)
9. **Document the legal basis** for data collection in code comments
10. **Test RLS** — verify cross-tenant data leakage is impossible
