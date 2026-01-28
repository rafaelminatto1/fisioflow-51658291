#!/bin/bash
# Starts Cloud SQL Proxy for local development
# Usage: ./scripts/db-proxy.sh [instance_connection_name]

# Default instance connection name
INSTANCE="fisioflow-migration:us-central1:fisioflow-pg"

if [ -n "$1" ]; then
  INSTANCE=$1
fi

echo "Starting Cloud SQL Proxy for instance: $INSTANCE"
echo "Make sure you have authenticated with: gcloud auth application-default login"

# Check if port 5432 is already in use
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Port 5432 is already in use. If it's another proxy, you're fine."
    echo "If it's a local Postgres, please stop it first or use a different port."
    # We don't exit here as it might be another instance of the proxy, 
    # but we warn the user.
fi

# Check for cloud-sql-proxy (V2)
if command -v cloud-sql-proxy &> /dev/null; then
    echo "✅ Found cloud-sql-proxy (V2)"
    echo "Starting proxy on port 5432..."
    cloud-sql-proxy $INSTANCE
    exit 0
fi

# Check for cloud_sql_proxy (V1)
if command -v cloud_sql_proxy &> /dev/null; then
    echo "✅ Found cloud_sql_proxy (V1)"
    echo "Starting proxy on port 5432..."
    cloud_sql_proxy -instances=$INSTANCE=tcp:5432
    exit 0
fi

echo "❌ cloud-sql-proxy not found in PATH."
echo "Please install it using:"
echo "  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.0/cloud-sql-proxy.linux.amd64"
echo "  chmod +x cloud-sql-proxy"
echo "  sudo mv cloud-sql-proxy /usr/local/bin/"
echo "Then try again."
exit 1
