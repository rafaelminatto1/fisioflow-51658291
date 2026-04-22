# FisioFlow NFS-e Integration Skill

Brazilian electronic service invoice (Nota Fiscal de Serviços Eletrônica) integration patterns for the FisioFlow physiotherapy clinic management system.

---

## 1. NFS-e Overview

NFS-e is the electronic service invoice mandated by Brazilian municipalities. Physiotherapy clinics classified as service providers under CNAE 8650-5/01 (or 8650-0/04 sub-activity) **must** emit NFS-e for every paid service session when the municipality requires it.

Key facts for FisioFlow:
- Emission is per-municipality — each city has its own web service (most follow ABRASF standard)
- FisioFlow uses **Focus NFe** as the intermediary — they manage the digital certificate (A1) and handle SOAP communication with the municipality
- The NFS-e lifecycle in FisioFlow: `rascunho` → `enviado` → `autorizado` | `erro` | `cancelado`

---

## 2. Focus NFe Integration

### 2.1 Configuration

**Environment variables** (see `apps/api/src/types/env.ts:160-161`):

| Variable | Description |
|---|---|
| `FOCUS_NFE_TOKEN` | API token from Focus NFe dashboard |
| `FOCUS_NFE_ENVIRONMENT` | `"production"` or `"homologacao"` |

**Per-organization config** stored in `nfse_config` table (see migration `0035_nfse.sql`):

| Field | Purpose |
|---|---|
| `cnpj` | Clinic CNPJ |
| `inscricao_municipal` | Municipal registration |
| `codigo_municipio` | IBGE city code (default `3550308` = São Paulo) |
| `regime_tributario` | `1` = Simples Nacional, `3` = Normal |
| `optante_simples` | Whether opted into Simples Nacional |
| `aliquota_padrao` | Default ISS rate (e.g. `0.02` = 2%) |
| `codigo_servico_padrao` | Default service code (e.g. `14.01`) |
| `discriminacao_padrao` | Default service description text |
| `ambiente` | `"homologacao"` or `"producao"` |

### 2.2 Base URL and Authentication

```typescript
const baseUrl = ambiente === 'producao'
  ? 'https://api.focusnfe.com.br'
  : 'https://homologacao.focusnfe.com.br';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Basic ${btoa(`${token}:`)}`,
};
```

Authentication is HTTP Basic with the token as username and empty password.

### 2.3 Endpoints Used

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v2/nfse?ref={ref}` | Emit NFS-e |
| `GET` | `/v2/nfse/{ref}` | Consult status |
| `DELETE` | `/v2/nfse/{ref}` | Cancel NFS-e |

### 2.4 Emission Request Payload

The reference (`ref`) is formatted as `fisioflow-{nfseRecordId}` to guarantee uniqueness.

```typescript
const payload = {
  data_emissao: new Date().toISOString(),
  natureza_operacao: 1,
  optante_simples_nacional: cfg.optante_simples ? 1 : 2,
  incentivador_cultural: cfg.incentivo_fiscal ? 1 : 2,
  status: 1,
  prestador: {
    cnpj: cfg.cnpj.replace(/\D/g, ''),
    inscricao_municipal: cfg.inscricao_municipal,
    codigo_municipio: cfg.codigo_municipio ?? '3550308',
  },
  tomador: {
    cpf: patientCpf.replace(/\D/g, ''),
    razao_social: patientName,
    email: patientEmail,
  },
  itens: [
    {
      discriminacao: 'Serviços de Fisioterapia',
      valor_unitario: sessionValue,
      quantidade: 1,
      item_lista_servico: cfg.codigo_servico_padrao ?? '14.01',
      aliquota_iss: (cfg.aliquota_padrao ?? 0.02) * 100,
      iss_retido: false,
    },
  ],
};

const ref = `fisioflow-${recordId}`;
const response = await fetch(`${baseUrl}/v2/nfse?ref=${ref}`, {
  method: 'POST',
  headers,
  body: JSON.stringify(payload),
});
```

### 2.5 Response Handling

Focus NFe may return the authorization immediately or require polling:

```typescript
interface FocusNFSeResponse {
  status: 'autorizado' | 'processando' | 'erro' | 'cancelado';
  numero?: string;
  codigo_verificacao?: string;
  caminho_danfe_nfse?: string;
  url?: string;
  erros?: Array<{ codigo: string; mensagem: string }>;
}
```

**Immediate authorization**: `status === 'autorizado'` — extract `numero`, `codigo_verificacao`, `link_nfse`.

**Processing**: poll `GET /v2/nfse/{ref}` every 5 seconds, up to 6 attempts (30s total). See `apps/api/src/routes/nfse.ts:404-427`.

**Timeout**: mark record as `enviado` — status will be updated later via manual check or webhook.

### 2.6 Status Polling

```typescript
async function pollNFSeStatus(
  baseUrl: string,
  token: string,
  ref: string,
  maxAttempts = 6,
  intervalMs = 5000,
): Promise<FocusNFSeResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const resp = await fetch(`${baseUrl}/v2/nfse/${ref}`, {
      headers: { Authorization: `Basic ${btoa(`${token}:`)}` },
    });

    if (!resp.ok) continue;

    const data = await resp.json() as FocusNFSeResponse;

    if (data.status === 'autorizado' || data.status === 'erro' || data.status === 'cancelado') {
      return data;
    }
  }

  return { status: 'processando' };
}
```

---

## 3. Service Codes

### 3.1 CNAE Codes for Physiotherapy

| CNAE | Description | When to use |
|---|---|---|
| `8650-5/01` | Atividades de atendimento hospitalar (includes physiotherapy) | General healthcare facility |
| `8650-0/04` | Atividades de fisioterapia | Standalone physiotherapy clinic |

The code `8650-0/04` is hardcoded in the RPS XML builder at `apps/api/src/routes/nfse.ts:182`.

### 3.2 Item da Lista de Serviços (LC 116/2003)

| Code | Description | Typical ISS rate |
|---|---|---|
| `14.01` | Serviços de fisioterapia | 2–5% |
| `14.02` | Serviços de medicina | — |
| `14.04` | Serviços de enfermagem | — |

FisioFlow defaults to `14.01` (see `nfse_config.codigo_servico_padrao`). This maps to **Art. 7º, Inciso XIV** of Lei Complementar 116/2003.

### 3.3 Municipality Codes

The default IBGE code in FisioFlow is `3550308` (São Paulo/SP). ISS rates vary by municipality:
- São Paulo: 2% (Simples Nacional) or 5% (Lucro Presumido)
- Rio de Janeiro: 5%
- Belo Horizonte: 3–5%

Always use `nfse_config.codigo_municipio` rather than hardcoding.

---

## 4. Tax Regime Considerations

The `nfse_config.regime_tributario` field drives fiscal behavior:

### Simples Nacional (regime_tributario = 1)

- ISS is **not charged separately** on the invoice — it is already embedded in the DAS (monthly unified tax)
- Set `optante_simples_nacional = 1` in the payload
- The aliquota field on the NFS-e is informational only
- FisioFlow sets `optante_simples = TRUE` by default
- ISS rate is typically 2% (informational)

### MEI (Microempreendedor Individual)

- MEI is a subset of Simples Nacional
- Same `optante_simples_nacional = 1`
- Some municipalities exempt MEI from NFS-e — check local rules
- Annual revenue limit: R$ 81.000 (2026)

### Lucro Presumido (regime_tributario = 3)

- ISS is actually charged — use real aliquota (typically 5%)
- Set `optante_simples_nacional = 2`
- Must calculate and display `valor_iss` on the invoice
- The `aliquota_padrao` in config should reflect the actual municipal rate

### Implications for the code

```typescript
const optanteSimples = cfg.optante_simples ? 1 : 2;
const aliquota = cfg.optante_simples
  ? cfg.aliquota_padrao
  : actualMunicipalRate;
const valorIss = cfg.optante_simples
  ? 0
  : Number((valorServico * aliquota).toFixed(2));
```

---

## 5. Invoice Flow

### 5.1 Complete Flow Diagram

```
Appointment completed
       │
       ▼
Validate patient data (name, CPF, address)
       │
       ▼
Fetch nfse_config for organization
       │
       ▼
Generate sequential RPS number
       │
       ▼
Create nfse_records row (status: 'rascunho')
       │
       ▼
POST /api/nfse/send/:id
       │
       ├── Focus NFe available? ──→ Send to Focus NFe API
       │                                    │
       │                                    ├── autorizado → Update record
       │                                    ├── processando → Poll (6x 5s)
       │                                    └── erro → Mark as erro
       │
       └── Homologação (no token) → Simulate authorization
                                          │
                                          ▼
                                   Status: 'autorizado'
                                          │
                                          ▼
                                   Download PDF (future: R2 storage)
```

### 5.2 Workflow Implementation (Cloudflare Workflows)

For automated emission after appointment completion, FisioFlow uses a Cloudflare Workflow (`apps/api/src/workflows/nfseWorkflow.ts`). This provides durable execution with automatic retries.

```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export type NFSeParams = {
  appointmentId: string;
  organizationId: string;
  patientName: string;
  patientCpf: string;
  serviceDescription: string;
  serviceValue: number;
  competencia: string;
};

export class NFSeWorkflow extends WorkflowEntrypoint<Env, NFSeParams> {
  async run(event: WorkflowEvent<NFSeParams>, step: WorkflowStep) {
    const { appointmentId, organizationId, patientName, patientCpf, serviceDescription, serviceValue } = event.payload;

    const rpsXml = await step.do('generate-rps-xml', async () => {
      return buildRPSXml({ appointmentId, patientName, patientCpf, serviceDescription, serviceValue });
    });

    const result = await step.do('send-to-focus-nfe', async () => {
      return sendViaFocusNfe(this.env, rpsXml, organizationId);
    });

    await step.do('update-status', async () => {
      const pool = createPool(this.env);
      await pool.query(
        `UPDATE nfse_records SET status = $1, numero_nfse = $2, updated_at = NOW()
         WHERE appointment_id = $3 AND organization_id = $4`,
        [result.status === 'autorizado' ? 'autorizado' : 'enviado', result.numero_nfse, appointmentId, organizationId],
      );
    });

    if (result.status !== 'autorizado') {
      try {
        const confirmation = await step.waitForEvent('nfse-confirmed', {
          type: 'nfse-confirmation',
          timeout: '30 minutes',
        });

        await step.do('save-confirmed', async () => {
          const pool = createPool(this.env);
          await pool.query(
            `UPDATE nfse_records SET status = 'autorizado', numero_nfse = $1, updated_at = NOW()
             WHERE appointment_id = $2`,
            [confirmation.payload.numero_nfse, appointmentId],
          );
        });
      } catch {
        await step.do('mark-pending', async () => {
          const pool = createPool(this.env);
          await pool.query(
            `UPDATE nfse_records SET status = 'pendente_revisao', updated_at = NOW()
             WHERE appointment_id = $1`,
            [appointmentId],
          );
        });
      }
    }
  }
}
```

### 5.3 Validation Before Emission

Before emitting, validate:

```typescript
function validateForEmission(record: NFSeRecord, config: NFSeConfig): string[] {
  const errors: string[] = [];

  if (!record.tomador_nome) errors.push('Tomador name is required');
  if (!record.valor_servico || record.valor_servico <= 0) errors.push('Service value must be positive');
  if (!config.cnpj) errors.push('Clinic CNPJ not configured');
  if (!config.inscricao_municipal) errors.push('Municipal registration not configured');
  if (!config.codigo_municipio) errors.push('Municipality code not configured');

  return errors;
}
```

### 5.4 PDF Generation and R2 Storage

After authorization, download the DANFSE PDF and store in R2:

```typescript
async function downloadAndStorePdf(env: Env, record: NFSeRecord): Promise<string> {
  if (!record.link_nfse) throw new Error('No NFS-e link available');

  const pdfResp = await fetch(record.link_nfse);
  const pdfBuffer = await pdfResp.arrayBuffer();

  const key = `nfse/${record.organization_id}/${record.id}.pdf`;
  await env.R2_BUCKET.put(key, pdfBuffer, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: {
      nfse_numero: record.numero_nfse ?? '',
      organization_id: record.organization_id,
    },
  });

  return key;
}
```

---

## 6. Error Handling

### 6.1 Common Rejection Reasons

| Error | Cause | Resolution |
|---|---|---|
| `E150` — RPS já enviado | Duplicate RPS number | Generate new sequential number |
| `E160` — Prestador não autorizado | CNPJ not registered with municipality | Register clinic with city hall |
| `E179` — Tomador inválido | Invalid CPF/CNPJ | Validate patient document with check digit |
| `E186` — Código de serviço inválido | Wrong `item_lista_servico` for municipality | Check municipal service code table |
| `E200` — Alíquota divergente | ISS rate doesn't match municipality table | Update `aliquota_padrao` in config |
| `E462` — Certificado expirado | Digital certificate expired | Renew via Focus NFe dashboard |
| Timeout | Municipality web service down | Workflow retries automatically |

### 6.2 Error Handling Pattern

```typescript
async function handleNFSeEmission(env: Env, recordId: string) {
  try {
    const result = await sendViaFocusNfe(env, record);

    if (result.status === 'autorizado') {
      await pool.query(
        `UPDATE nfse_records SET status = 'autorizado', numero_nfse = $1,
                codigo_verificacao = $2, link_nfse = $3, focus_nfe_ref = $4, updated_at = NOW()
         WHERE id = $5`,
        [result.numero_nfse, result.codigo_verificacao, result.link_nfse, result.ref, recordId],
      );
      return { success: true };
    }

    if (result.status === 'erro') {
      await pool.query(
        `UPDATE nfse_records SET status = 'erro', erro_message = $1, focus_nfe_ref = $2, updated_at = NOW()
         WHERE id = $3`,
        [result.erros, result.ref, recordId],
      );
      return { success: false, error: result.erros };
    }

    await pool.query(
      `UPDATE nfse_records SET status = 'enviado', focus_nfe_ref = $1, updated_at = NOW() WHERE id = $2`,
      [result.ref, recordId],
    );
    return { success: true, status: 'processing' };
  } catch (err) {
    console.error('[NFSe] Unhandled error:', err);
    await pool.query(
      `UPDATE nfse_records SET status = 'erro', erro_message = $1, updated_at = NOW() WHERE id = $2`,
      [String(err), recordId],
    );
    throw err;
  }
}
```

### 6.3 Retry Strategy

- **Cloudflare Workflows**: automatic retry with exponential backoff for `step.do()` calls
- **Route handler polling**: 6 attempts × 5s interval for status check
- **Manual intervention**: records stuck in `enviado` or `pendente_revisao` should appear in the admin dashboard for manual status check via `GET /api/nfse/status/:ref`

---

## 7. Database Patterns

### 7.1 Schema (nfse_records)

Defined in migration `0035_nfse.sql`, extended by `0038_nfse_focus_ref.sql`:

```sql
CREATE TABLE nfse_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  numero_nfse TEXT,
  numero_rps TEXT NOT NULL,
  serie_rps TEXT NOT NULL DEFAULT 'RPS',
  data_emissao TIMESTAMPTZ DEFAULT NOW(),
  valor_servico NUMERIC(10,2) NOT NULL,
  aliquota_iss NUMERIC(5,4) DEFAULT 0.02,
  valor_iss NUMERIC(10,2),
  valor_deducoes NUMERIC(10,2) DEFAULT 0,
  valor_base_calculo NUMERIC(10,2),
  iss_retido BOOLEAN DEFAULT FALSE,
  codigo_servico TEXT NOT NULL DEFAULT '14.01',
  discriminacao TEXT NOT NULL,
  municipio_prestacao TEXT DEFAULT '3550308',
  tomador_nome TEXT,
  tomador_cpf_cnpj TEXT,
  tomador_email TEXT,
  tomador_logradouro TEXT,
  tomador_numero TEXT,
  tomador_complemento TEXT,
  tomador_bairro TEXT,
  tomador_cidade TEXT,
  tomador_uf TEXT,
  tomador_cep TEXT,
  status TEXT DEFAULT 'rascunho',
  erro_message TEXT,
  xml_rps TEXT,
  xml_nfse TEXT,
  numero_lote TEXT,
  codigo_verificacao TEXT,
  link_nfse TEXT,
  focus_nfe_ref VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nfse_records_org ON nfse_records (organization_id);
CREATE INDEX idx_nfse_records_patient ON nfse_records (patient_id);
CREATE INDEX idx_nfse_records_status ON nfse_records (status);
CREATE INDEX idx_nfse_records_data_emissao ON nfse_records (data_emissao DESC);
CREATE INDEX idx_nfse_records_focus_ref ON nfse_records (focus_nfe_ref) WHERE focus_nfe_ref IS NOT NULL;
```

### 7.2 Schema (nfse_config)

```sql
CREATE TABLE nfse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  inscricao_municipal TEXT NOT NULL,
  codigo_municipio TEXT NOT NULL DEFAULT '3550308',
  regime_tributario TEXT DEFAULT '1',
  optante_simples BOOLEAN DEFAULT TRUE,
  incentivo_fiscal BOOLEAN DEFAULT FALSE,
  aliquota_padrao NUMERIC(5,4) DEFAULT 0.02,
  codigo_servico_padrao TEXT DEFAULT '14.01',
  discriminacao_padrao TEXT DEFAULT 'Serviços de Fisioterapia',
  certificado_pfx_kv_key TEXT,
  ambiente TEXT DEFAULT 'homologacao',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 RPS Number Generation

RPS numbers are sequential per organization:

```typescript
const seqResult = await pool.query(
  `SELECT COALESCE(MAX(CAST(numero_rps AS INTEGER)), 0) + 1 AS next_rps
   FROM nfse_records WHERE organization_id = $1`,
  [organizationId],
);
const numeroRps = String(seqResult.rows[0]?.next_rps ?? 1);
```

### 7.4 Status Transitions

```
rascunho ──→ enviado ──→ autorizado
   │              │
   │              ├──→ erro
   │              └──→ pendente_revisao (workflow timeout)
   │
   └──→ cancelado (before sending)

autorizado ──→ cancelado (via DELETE endpoint)
```

### 7.5 Querying NFS-e Records

Filter by patient, month, and status (see `apps/api/src/routes/nfse.ts:70-109`):

```typescript
const result = await pool.query(
  `SELECT id, patient_id, appointment_id, numero_nfse, numero_rps, serie_rps,
          data_emissao, valor_servico, aliquota_iss, valor_iss, status,
          codigo_verificacao, link_nfse, tomador_nome, created_at
   FROM nfse_records
   WHERE organization_id = $1
     AND ($2::uuid IS NULL OR patient_id = $2)
     AND ($3::date IS NULL OR data_emissao >= $3)
     AND ($4::date IS NULL OR data_emissao <= $4)
     AND ($5::text IS NULL OR status = $5)
   ORDER BY data_emissao DESC
   LIMIT $6`,
  [organizationId, patientId, startDate, endDate, status, limit],
);
```

---

## 8. Key Files

| File | Purpose |
|---|---|
| `apps/api/src/routes/nfse.ts` | REST API routes — CRUD, emission, status check, cancel |
| `apps/api/src/workflows/nfseWorkflow.ts` | Durable Cloudflare Workflow for automated emission |
| `apps/api/src/lib/fiscal/NFSeService.ts` | Focus NFe API client class |
| `apps/professional-app/lib/api/nfse.ts` | Frontend API client types and fetch functions |
| `apps/professional-app/app/nfse-form.tsx` | Mobile NFS-e emission form (React Native) |
| `apps/api/migrations/0035_nfse.sql` | Initial schema: `nfse_records` + `nfse_config` |
| `apps/api/migrations/0038_nfse_focus_ref.sql` | Adds `focus_nfe_ref` column |

---

## 9. Testing Patterns

### 9.1 Homologação Mode

When `FOCUS_NFE_TOKEN` is not set and `ambiente === 'homologacao'`, the system simulates authorization:

```typescript
if (!token && ambiente === 'homologacao') {
  const numeroNfse = String(Date.now()).slice(-8);
  const codigoVerificacao = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  await pool.query(
    `UPDATE nfse_records SET status = 'autorizado', numero_nfse = $1,
            codigo_verificacao = $2, link_nfse = $3, updated_at = NOW() WHERE id = $4`,
    [numeroNfse, codigoVerificacao, `https://nfe.prefeitura.sp.gov.br/...?nf=${numeroNfse}&c=${codigoVerificacao}`, id],
  );
}
```

### 9.2 Focus NFe Sandbox

Focus NFe provides a homologação environment at `https://homologacao.focusnfe.com.br`. Use this for integration testing — the API behaves identically to production but does not generate real invoices.

---

## 10. Important Notes

- **Always validate patient CPF** before emission — invalid CPF is the #1 rejection reason
- **RPS numbers must be sequential** per CNPJ — gaps are not allowed by most municipalities
- **The `focus_nfe_ref` column** is critical for status polling — never emit without storing it
- **Cancellation** in FisioFlow currently only updates the local status — for real cancellation, call `DELETE /v2/nfse/{ref}` on Focus NFe
- **The ABRASF XML standard** varies slightly between municipalities — Focus NFe handles these differences, but the `codigo_servico` must match the municipality's service table
- **ISS retention** (`iss_retido`) is `false` by default for physiotherapy — set to `true` only when the service recipient (e.g., a health plan) is responsible for withholding
