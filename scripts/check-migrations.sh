#!/usr/bin/env bash
# Valida convenção de nomenclatura e integridade das migrations manuais.
# Uso: ./scripts/check-migrations.sh
# Exit 0 = OK; Exit 1 = erro crítico (duplicatas, sem número, conflito).

set -euo pipefail

MIGRATIONS_DIR="${1:-apps/api/migrations}"
ERRORS=0
WARNINGS=0

echo "=== Migration Validator ==="
echo "Dir: $MIGRATIONS_DIR"
echo ""

# ── 1. Arquivos sem número de sequência (ignora .down.sql) ─────────────────
echo "[ Verificando nomenclatura NNNN_descricao.sql ]"
while IFS= read -r -d '' file; do
  base=$(basename "$file")
  # Ignora scripts de rollback (.down.sql) e arquivos de documentação (.md)
  [[ "$base" == *.down.sql ]] && continue
  [[ "$base" == *.md ]] && continue
  if [[ ! "$base" =~ ^[0-9]{4}_[a-z0-9_]+\.sql$ ]]; then
    echo "  ERRO: '$base' não segue padrão NNNN_descricao.sql"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" -print0 | sort -z)

# ── 2. Duplicatas de prefixo (ignora .down.sql) ────────────────────────────
echo "[ Verificando duplicatas de prefixo ]"
declare -A seen_prefixes
while IFS= read -r -d '' file; do
  base=$(basename "$file")
  [[ "$base" == *.down.sql ]] && continue
  prefix="${base:0:4}"
  if [[ -n "${seen_prefixes[$prefix]+x}" ]]; then
    echo "  ERRO: Prefixo '$prefix' duplicado: '$base' e '${seen_prefixes[$prefix]}'"
    ERRORS=$((ERRORS + 1))
  else
    seen_prefixes[$prefix]="$base"
  fi
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "[0-9][0-9][0-9][0-9]_*.sql" -print0 | sort -z)

# ── 3. Gaps > 5 na sequência (aviso) ───────────────────────────────────────
echo "[ Verificando gaps na sequência ]"
prev=-1
while IFS= read -r -d '' file; do
  base=$(basename "$file")
  num=$((10#${base:0:4}))
  if [[ $prev -ge 0 ]]; then
    gap=$((num - prev))
    if [[ $gap -gt 5 ]]; then
      echo "  AVISO: Gap de $gap entre $(printf '%04d' $prev) e $(printf '%04d' $num)"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
  prev=$num
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "[0-9][0-9][0-9][0-9]_*.sql" -print0 | sort -z)

# ── 4. Migrations sem script down ──────────────────────────────────────────
echo "[ Verificando scripts down ]"
MISSING_DOWN=0
while IFS= read -r -d '' file; do
  base=$(basename "$file")
  down_file="${MIGRATIONS_DIR}/${base%.sql}.down.sql"
  if [[ ! -f "$down_file" ]]; then
    MISSING_DOWN=$((MISSING_DOWN + 1))
  fi
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "[0-9][0-9][0-9][0-9]_*.sql" ! -name "*.down.sql" -print0 | sort -z)
if [[ $MISSING_DOWN -gt 0 ]]; then
  echo "  AVISO: $MISSING_DOWN migration(s) sem script .down.sql"
  WARNINGS=$((WARNINGS + 1))
fi

# ── Resultado ──────────────────────────────────────────────────────────────
echo ""
echo "=== Resultado ==="
TOTAL=$(find "$MIGRATIONS_DIR" -maxdepth 1 -name "[0-9][0-9][0-9][0-9]_*.sql" ! -name "*.down.sql" | wc -l | tr -d ' ')
echo "Migrations encontradas: $TOTAL"
echo "Erros críticos:  $ERRORS"
echo "Avisos:          $WARNINGS"

if [[ $ERRORS -gt 0 ]]; then
  echo ""
  echo "FALHOU: Corrija os erros críticos antes de prosseguir."
  exit 1
fi

echo ""
echo "OK: Todas as migrations passaram na validação."
exit 0
