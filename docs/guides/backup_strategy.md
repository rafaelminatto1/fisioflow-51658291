# Backup & Recovery Strategy: Neon DB

This document outlines the backup procedures and disaster recovery strategy for the FisioFlow production database on Neon.

## 1. Automated Backups (Point-in-Time Recovery)

Neon automatically performs continuous backups of your data. This allows for **Point-in-Time Recovery (PITR)**.

- **Retention Period:** 30 days (Pro Tier).
- **Functionality:** Allows restoring the database state to any specific microsecond within the retention window.
- **Action:** No manual configuration is required in the code for the primary backup layer.

## 2. Redundancy: Logic Snapshots to Cloudflare R2

As a secondary safety layer, we maintain logical `pg_dump` snapshots stored in a private Cloudflare R2 bucket.

### 2.1 Backup Script
Location: `.agent/scripts/db_backup_to_r2.py` (To be implemented).

The script follows this flow:
1. Connect via `pg_dump` through Hyperdrive.
2. Compress the output to `.tar.gz`.
3. Encrypt the file using a project-specific key.
4. Upload to the `fisioflow-backups` R2 bucket with a lifecycle policy of 90 days.

## 3. Disaster Recovery (DR)

### Scenario A: Accidental Data Deletion
1. Identify the timestamp of the last valid state.
2. Use the Neon Dashboard to "Restore to a specific time".
3. Point the `HYPERDRIVE` binding in Cloudflare to the restored branch.

### Scenario B: Regional Cloudflare Outage
1. Our backend is deployed on Cloudflare Global Network. If a region fails, another picks up.
2. The Database remains available via direct Neon connection strings if Hyperdrive is impacted.

## 4. Verification

Backups must be verified monthly:
- Perform a test restore to a `staging` branch in Neon.
- Verify data integrity using the automated test suite (`npm run test:prod`).
