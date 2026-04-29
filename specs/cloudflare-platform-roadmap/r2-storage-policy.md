# R2 Storage Policy

**Created**: 2026-04-28  
**Scope**: `MEDIA_BUCKET` production and staging buckets.

## Storage Classes

| Class | Prefix Pattern | PHI | Signed URL TTL | Retention |
|-------|----------------|-----|----------------|-----------|
| Clinical document | `orgs/{orgId}/patients/{patientId}/documents/{file}` | Yes | 15 minutes default, 1 hour max | Legal/clinical retention |
| Clinical image | `orgs/{orgId}/patients/{patientId}/images/{file}` | Yes | 15 minutes default, 1 hour max | Legal/clinical retention |
| Clinical video | `orgs/{orgId}/patients/{patientId}/videos/{file}` | Yes | 15 minutes default, 1 hour max | Legal/clinical retention |
| DICOM | `orgs/{orgId}/patients/{patientId}/dicom/{file}` | Yes | 15 minutes default, 1 hour max | Legal/clinical retention |
| Audio/transcription source | `orgs/{orgId}/patients/{patientId}/audio/{file}` | Yes | 15 minutes default, 1 hour max | Legal/clinical retention or explicit clinic policy |
| Telemedicine recording | `recordings/{appointmentId}/{timestamp}.webm` | Yes | 15 minutes default, 1 hour max | Clinic policy; consider shorter retention |
| DANFSe | `orgs/{orgId}/nfse/{nfseId}/danfse.pdf` | Yes/financial | 15 minutes default, 1 hour max | Fiscal retention |
| Temporary AI artifact | `tmp/ai/{orgId}/{requestId}/{file}` | Yes possible | 5 minutes default | Expire automatically |
| Public exercise media | `public/exercises/{exerciseId}/{file}` | No, if curated | CDN/public policy | Product content retention |
| Pipeline staging export | `pipelines/events-staging/...` | Operational | No direct public URL | Operational retention |

## Required Metadata

Protected objects should include:

- `organizationId`
- `patientId` when applicable
- `contentClass`
- `createdBy` when available
- `sourceFeature`
- `retentionClass`

## Access Rules

- Protected objects must be accessed through authenticated API checks and signed URLs.
- Signed URLs for PHI should default to 900 seconds.
- API callers may request shorter TTLs; longer TTLs require server-side allowlist.
- Public exercise media must not include patient identifiers.

## Lifecycle Recommendations

- Expire `tmp/ai/` objects aggressively after processing.
- Keep pipeline staging exports separate from clinical media prefixes.
- Do not enable public bucket access for PHI prefixes.
- Review telemedicine recording retention with legal/compliance owner before broad rollout.

## Audit Events

Emit audit/analytics events for:

- Protected upload URL creation.
- Protected download URL creation.
- Delete operations.
- DANFSe generation.
- Temporary AI artifact cleanup failures.

