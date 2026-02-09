#!/bin/bash
# Script para executar testes E2E com Firebase Emulator
# Resolve o problema de "Firebase Quota Exceeded"
#
# Uso:
#   bash scripts/run-e2e-with-emulator.sh
#   OU
#   bash scripts/run-e2e-with-emulator.sh e2e/auth.spec.ts  # teste específico

set -e

# Cores do terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuração
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIREBASE_AUTH_PORT=9099
FIRESTORE_PORT=8080
PID_FILE="$PROJECT_ROOT/.firebase-emulator-pids"

# Credenciais de teste (do .env.test)
TEST_EMAIL="teste@moocafisio.com.br"
TEST_PASSWORD="Yukari3030@"

echo ""
echo "=========================================="
echo "  FisioFlow E2E Tests - Firebase Emulator"
echo "=========================================="
echo ""

# Função para limpar ao sair
cleanup() {
    echo ""
    echo -e "${BLUE}🧹 Limpando...${NC}"

    # Matar emuladores se estiverem rodando
    if [ -f "$PID_FILE" ]; then
        echo "Parando Firebase Emulators..."
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
        echo -e "${GREEN}✅ Emuladores parados${NC}"
    fi

    # Matar processos firebase-emulator órfãos
    pkill -f "firebase.*emulator" 2>/dev/null || true
}

# Trap para garantir limpeza
trap cleanup EXIT INT TERM

# Função para verificar se uma porta está em uso
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Função para aguardar porta estar disponível
wait_for_port() {
    local port=$1
    local name=$2
    local max_wait=30
    local count=0

    echo -e "${YELLOW}⏳ Aguardando $name na porta $port...${NC}"
    while ! port_in_use "$port" && [ $count -lt $max_wait ]; do
        sleep 1
        count=$((count + 1))
    done

    if port_in_use "$port"; then
        echo -e "${GREEN}✅ $name está rodando${NC}"
        return 0
    else
        echo -e "${RED}❌ $name não iniciou após ${max_wait}s${NC}"
        return 1
    fi
}

# Função para iniciar os emuladores
start_emulators() {
    echo -e "${BLUE}🔥 Iniciando Firebase Emulators...${NC}"

    # Verificar se firebase-tools está instalado
    if ! command -v firebase &> /dev/null; then
        echo -e "${YELLOW}⚠️  Firebase CLI não encontrado. Instalando...${NC}"
        npm install -g firebase-tools
    fi

    # Iniciar emuladores em background
    cd "$PROJECT_ROOT"
    firebase emulators:start --only auth,firestore --project fisioflow-migration > /tmp/firebase-emulator.log 2>&1 &
    EMULATOR_PID=$!
    echo "$EMULATOR_PID" > "$PID_FILE"

    # Aguardar emuladores ficarem prontos
    if wait_for_port $FIREBASE_AUTH_PORT "Auth Emulator" && \
       wait_for_port $FIRESTORE_PORT "Firestore Emulator"; then
        echo -e "${GREEN}✅ Firebase Emulators iniciados (PID: $EMULATOR_PID)${NC}"
        echo "   Auth: http://localhost:$FIREBASE_AUTH_PORT"
        echo "   Firestore: http://localhost:$FIRESTORE_PORT"
        return 0
    else
        echo -e "${RED}❌ Falha ao iniciar emuladores${NC}"
        echo "Log: /tmp/firebase-emulator.log"
        cat /tmp/firebase-emulator.log
        return 1
    fi
}

# Função para criar usuário de teste no Auth Emulator
create_test_user() {
    echo ""
    echo -e "${BLUE}👤 Criando usuário de teste no Auth Emulator...${NC}"

    # Usar a API REST do Auth Emulator
    local response=$(curl -s -X POST "http://localhost:$FIREBASE_AUTH_PORT/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"returnSecureToken\": true
        }" 2>&1)

    # Verificar se usuário foi criado ou se já existe
    if echo "$response" | grep -q "email\|idToken"; then
        echo -e "${GREEN}✅ Usuário criado com sucesso${NC}"
        return 0
    elif echo "$response" | grep -q "EMAIL_EXISTS"; then
        echo -e "${YELLOW}⚠️  Usuário já existe${NC}"
        return 0
    else
        echo -e "${RED}❌ Erro ao criar usuário:${NC}"
        echo "$response"
        return 1
    fi
}

# Função para executar seed data
run_seed_data() {
    echo ""
    echo -e "${BLUE}📱 Executando seed data...${NC}"

    cd "$PROJECT_ROOT"

    # Carregar variáveis do .env.test
    if [ -f ".env.test" ]; then
        export $(grep -v '^#' .env.test | xargs)
    fi

    # Configurar variáveis para o emulador
    export FIRESTORE_EMULATOR_HOST=localhost:$FIRESTORE_PORT
    export FIREBASE_AUTH_EMULATOR_HOST=localhost:$FIREBASE_AUTH_PORT

    if node scripts/seed-e2e-data.cjs; then
        echo -e "${GREEN}✅ Seed data concluído${NC}"
        return 0
    else
        echo -e "${RED}❌ Erro ao executar seed data${NC}"
        return 1
    fi
}

# Função para executar testes E2E
run_tests() {
    echo ""
    echo -e "${BLUE}🧪 Executando testes E2E...${NC}"
    echo ""

    cd "$PROJECT_ROOT"

    # Configurar variáveis de ambiente para os testes
    export BASE_URL=http://127.0.0.1:8084
    export VITE_FIREBASE_AUTH_EMULATOR_HOST=localhost:$FIREBASE_AUTH_PORT
    export VITE_FIRESTORE_EMULATOR_HOST=localhost:$FIRESTORE_PORT
    export FIREBASE_AUTH_EMULATOR_HOST=localhost:$FIREBASE_AUTH_PORT
    export FIRESTORE_EMULATOR_HOST=localhost:$FIRESTORE_PORT

    # Executar testes
    local test_spec="$1"

    if [ -n "$test_spec" ]; then
        echo "Executando: $test_spec"
        npx playwright test "$test_spec" --project=chromium --workers=1
    else
        echo "Executando todos os testes E2E (Chromium)"
        npx playwright test e2e --project=chromium --workers=2
    fi

    local exit_code=$?

    echo ""
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Testes concluídos com sucesso!${NC}"
    else
        echo -e "${YELLOW}⚠️  Alguns testes falharam${NC}"
    fi

    echo ""
    echo "Para ver o relatório completo:"
    echo -e "  ${YELLOW}npx playwright show-report${NC}"

    return $exit_code
}

# Main
main() {
    local test_spec="$1"

    # 1. Iniciar emuladores
    if ! start_emulators; then
        exit 1
    fi

    # 2. Criar usuário de teste
    if ! create_test_user; then
        exit 1
    fi

    # 3. Executar seed data
    if ! run_seed_data; then
        echo -e "${YELLOW}⚠️  Continuando mesmo com erro no seed...${NC}"
    fi

    # 4. Executar testes
    run_tests "$test_spec"
    exit $?
}

# Executar
main "$@"
