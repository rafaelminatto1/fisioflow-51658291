#!/bin/bash

# 🔍 Script de Verificação Rápida - Integrações Pro FisioFlow
# Execute: bash QUICK_VERIFICATION.sh

echo "════════════════════════════════════════════════════════════════"
echo "  ✅ VERIFICAÇÃO RÁPIDA - INTEGRAÇÕES PRO FISIOFLOW"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Contadores
TOTAL=0
PASS=0
FAIL=0

check() {
  TOTAL=$((TOTAL + 1))
  if eval "$1"; then
    echo -e "${GREEN}✅${NC} $2"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌${NC} $2"
    FAIL=$((FAIL + 1))
  fi
}

echo "📋 VERIFICANDO ARQUIVOS E CONFIGURAÇÕES"
echo "──────────────────────────────────────────────────────────────"

check "[ -f .env.local ]" ".env.local existe"
check "grep -q 'KV_URL=' .env.local 2>/dev/null" "KV_URL configurado"
check "grep -q 'KV_REST_API_URL=' .env.local 2>/dev/null" "KV_REST_API_URL configurado"
check "grep -q 'KV_REST_API_TOKEN=' .env.local 2>/dev/null" "KV_REST_API_TOKEN configurado"
check "grep -q 'REDIS_URL=' .env.local 2>/dev/null" "REDIS_URL configurado"
check "grep -q 'OPENAI_API_KEY=' .env.local 2>/dev/null" "OPENAI_API_KEY configurada"
check "grep -q 'CRON_SECRET=' .env.local 2>/dev/null" "CRON_SECRET configurado"
check "grep -q 'VITE_FEATURE_AI_TRANSCRIPTION=' .env.local 2>/dev/null" "Feature flags configuradas"
check "[ -f src/lib/cache/KVCacheService.ts ]" "KVCacheService existe"
check "[ -f src/lib/featureFlags/envFlags.ts ]" "envFlags existe"
check "[ -f src/lib/vector/embeddings.ts ]" "Embeddings service existe"
check "[ -f src/lib/auth/mfa.ts ]" "MFA service existe"
check "[ -f src/components/auth/MFASettings.tsx ]" "MFASettings component existe"
check "[ -f scripts/generate-embeddings.ts ]" "Script de embeddings existe"
check "[ -f supabase/migrations/20250110000000_add_mfa_support.sql ]" "Migration MFA existe"
check "[ -f supabase/migrations/20250110120000_enable_vector.sql ]" "Migration Vector existe"
check "[ -f vercel.json ]" "vercel.json existe"
check "grep -q '\"crons\"' vercel.json" "Cron jobs configurados"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  📊 RESULTADO: $PASS/$TOTAL passaram ($(( PASS * 100 / TOTAL ))%)"
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 PARABÉNS! Toda configuração local está completa!${NC}"
  echo ""
  echo "📝 PRÓXIMOS PASSOS:"
  echo "   1. Verificar variáveis no Vercel Dashboard"
  echo "   2. Aplicar migrations no Supabase"
  echo "   3. Gerar embeddings"
  echo "   4. Deploy para produção"
  echo ""
  echo "📚 Veja VERIFICATION_GUIDE.md para instruções detalhadas"
else
  echo -e "${YELLOW}⚠️  $FAIL verificação(ões) falhou(aram)${NC}"
  echo ""
  echo "📝 Revise os itens acima e veja TODO_CHECKLIST.md"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
