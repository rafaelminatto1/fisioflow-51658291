#!/usr/bin/env bash

set -euo pipefail

WEB_URL="https://fisioflow-web.rafalegollas.workers.dev"
API_URL="https://api-pro.moocafisio.com.br/api/health"

usage() {
  cat <<'EOF'
Usage: bash scripts/smoke-check.sh [options]

Options:
  --web-url <url>   Web app URL to validate
  --api-url <url>   API health URL to validate
  -h, --help        Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-url)
      WEB_URL="${2:-}"
      shift 2
      ;;
    --api-url)
      API_URL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$WEB_URL" || -z "$API_URL" ]]; then
  echo "Both --web-url and --api-url are required" >&2
  exit 1
fi

echo "[smoke] Checking web: $WEB_URL"
curl -fsSIL "$WEB_URL" >/dev/null

echo "[smoke] Checking api: $API_URL"
curl -fsS "$API_URL" >/dev/null

echo "[smoke] Smoke checks passed"
