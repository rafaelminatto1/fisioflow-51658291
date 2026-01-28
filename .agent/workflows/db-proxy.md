---
description: Manage Cloud SQL Proxy connection for local development.
---

# /db-proxy - Cloud SQL Proxy Management

Start the Cloud SQL Auth Proxy to enable local connection to the Cloud SQL instance.

## Usage

```bash
# Start proxy to default instance
npm run db:proxy

# Start proxy to specific instance
./scripts/db-proxy.sh [instance-connection-name]
```

## When to use

- When running Cloud Functions locally (`firebase emulators:start`) that need to connect to the production/staging SQL database.
- When running local scripts that modify the SQL database.

## Prerequisites

- `gcloud auth application-default login` must be run previously.
- `cloud-sql-proxy` (V2) or `cloud_sql_proxy` (V1) must be installed.
