#!/usr/bin/env bash
# Lista os consumidores UI de um helper IA legado.
# Uso: bash scripts/find-ai-consumers.sh <module-basename>
#      bash scripts/find-ai-consumers.sh clinical-support
#      bash scripts/find-ai-consumers.sh pain-analysis

set -euo pipefail

MODULE="${1:-}"
if [[ -z "$MODULE" ]]; then
  echo "Uso: $0 <module-basename>" >&2
  echo "Módulos auditáveis: clinical-support rag-clinical soap-assistant pain-analysis exercises" >&2
  exit 1
fi

MODULE_PATH="src/lib/ai/${MODULE}.ts"
if [[ ! -f "$MODULE_PATH" ]]; then
  echo "Módulo não encontrado: $MODULE_PATH" >&2
  exit 1
fi

echo "==> Consumidores diretos de @/lib/ai/$MODULE"
grep -rln "from \"@/lib/ai/${MODULE}\"\|from \"@/lib/ai\"" src/ 2>/dev/null \
  | grep -v "__tests__\|\.test\.\|\.stories\." \
  | grep -v "^${MODULE_PATH}$" \
  | sort -u || true

echo ""
echo "==> Tipos/símbolos exportados deste módulo"
grep -nE "^export " "$MODULE_PATH" | head -30

echo ""
echo "==> Referências a 'currentSOAP' / 'subjective' neste módulo"
grep -cE "currentSOAP|subjective|objective|assessment|\\.plan" "$MODULE_PATH" || echo "0"

echo ""
echo "Sugestão: rodar o template em docs2026/ai-soap-refactor-plan.md para este módulo."
