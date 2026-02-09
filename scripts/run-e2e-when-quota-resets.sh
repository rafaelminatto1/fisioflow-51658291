#!/bin/bash
# Script para executar testes E2E quando a quota do Firebase resetar
# Execute: bash scripts/run-e2e-when-quota-resets.sh

set -e

echo "=========================================="
echo "FisioFlow E2E Tests - Firebase Quota Check"
echo "=========================================="
echo ""

# Cores do terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se quota resetou
check_firebase_quota() {
    echo "Verificando se a quota do Firebase resetou..."

    # Tenta fazer login para verificar quota
    TEMP_OUTPUT=$(npx playwright test e2e/auth.spec.ts --project=chromium --workers=1 --grep="deve fazer login com credenciais válidas" --reporter=line 2>&1)

    if echo "$TEMP_OUTPUT" | grep -q "passed"; then
        echo -e "${GREEN}✅ Quota do Firebase resetada! Testes podem ser executados.${NC}"
        return 0
    else
        echo -e "${RED}❌ Quota do Firebase ainda excedida.${NC}"
        if echo "$TEMP_OUTPUT" | grep -q "quota-exceeded"; then
            echo -e "${YELLOW}Erro: auth/quota-exceeded${NC}"
        fi
        return 1
    fi
}

# Função para executar todos os testes
run_all_tests() {
    echo ""
    echo "=========================================="
    echo "Executando todos os testes E2E..."
    echo "=========================================="
    echo ""

    npx playwright test e2e --project=chromium --workers=2 --reporter=html

    echo ""
    echo -e "${GREEN}=========================================="
    echo "Testes concluídos!"
    echo "==========================================${NC}"
    echo ""
    echo "Para ver o relatório completo:"
    echo -e "${YELLOW}npx playwright show-report${NC}"
    echo ""
}

# Main
echo "Este script verifica se a quota do Firebase resetou antes de executar os testes."
echo ""

# Verificar quota
if check_firebase_quota; then
    # Quota resetada, executar testes
    run_all_tests
else
    echo ""
    echo -e "${YELLOW}A quota do Firebase ainda está excedida.${NC}"
    echo "A quota geralmente reseta em ~1 hora após ser excedida."
    echo ""
    echo "Execute este script novamente em alguns minutos:"
    echo -e "  ${GREEN}bash scripts/run-e2e-when-quota-resets.sh${NC}"
    echo ""
    exit 1
fi
