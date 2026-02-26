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
EMULATOR_HOST=127.0.0.1
WEB_PORT=8084
WEB_HOST=127.0.0.1
PID_FILE="$PROJECT_ROOT/.firebase-emulator-pids"
WEB_PID_FILE="$PROJECT_ROOT/.web-e2e.pid"

# Credenciais de teste (do .env.test)
TEST_EMAIL="teste@moocafisio.com.br"
TEST_PASSWORD="Yukari3030@"
TEST_UID=""

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

    # Parar servidor web de teste
    if [ -f "$WEB_PID_FILE" ]; then
        local web_pid
        web_pid="$(cat "$WEB_PID_FILE" 2>/dev/null || true)"
        if [ -n "$web_pid" ] && kill -0 "$web_pid" 2>/dev/null; then
            echo "Parando servidor web de teste..."
            kill "$web_pid" 2>/dev/null || true
        fi
        rm -f "$WEB_PID_FILE"
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

wait_for_http() {
    local url=$1
    local name=$2
    local max_wait=60
    local count=0

    echo -e "${YELLOW}⏳ Aguardando $name em $url...${NC}"
    while [ $count -lt $max_wait ]; do
        if curl -fsS "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name está respondendo${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    echo -e "${RED}❌ $name não respondeu após ${max_wait}s${NC}"
    return 1
}

assert_preview_server() {
    local index_html
    index_html="$(curl -fsS "http://${WEB_HOST}:${WEB_PORT}/" || true)"
    if echo "$index_html" | rg -q "/src/main\\.(ts|tsx)|@vite/client"; then
        echo -e "${RED}❌ Servidor em ${WEB_PORT} está em modo dev, não preview buildado${NC}"
        return 1
    fi
    return 0
}

# Função para iniciar os emuladores
start_emulators() {
    echo -e "${BLUE}🔥 Iniciando Firebase Emulators...${NC}"

    # Verificar se firebase-tools está instalado
    if ! command -v firebase &> /dev/null; then
        echo -e "${YELLOW}⚠️  Firebase CLI não encontrado. Instalando...${NC}"
        npm install -g firebase-tools
    fi

    # Garantir portas livres (evita falso positivo de "emulador rodando")
    local emulator_pids
    emulator_pids="$(lsof -ti ":${FIREBASE_AUTH_PORT}" ":${FIRESTORE_PORT}" 2>/dev/null || true)"
    if [ -n "$emulator_pids" ]; then
        echo -e "${YELLOW}⚠️  Portas de emulador ocupadas. Encerrando processo(s): $emulator_pids${NC}"
        echo "$emulator_pids" | xargs -r kill
        sleep 1
    fi

    # Iniciar emuladores em background
    cd "$PROJECT_ROOT"
    firebase emulators:start --only auth,firestore --project fisioflow-migration > /tmp/firebase-emulator.log 2>&1 &
    EMULATOR_PID=$!
    echo "$EMULATOR_PID" > "$PID_FILE"

    # Aguardar emuladores ficarem prontos
    if wait_for_port $FIREBASE_AUTH_PORT "Auth Emulator" && \
       wait_for_port $FIRESTORE_PORT "Firestore Emulator"; then
        if ! kill -0 "$EMULATOR_PID" 2>/dev/null; then
            echo -e "${RED}❌ Processo dos emuladores encerrou inesperadamente${NC}"
            echo "Log: /tmp/firebase-emulator.log"
            tail -n 120 /tmp/firebase-emulator.log || true
            return 1
        fi
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
    local response=$(curl -s -X POST "http://$EMULATOR_HOST:$FIREBASE_AUTH_PORT/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"returnSecureToken\": true
        }" 2>&1)

    # Verificar se usuário foi criado ou se já existe
    if echo "$response" | grep -q "email\|idToken"; then
        TEST_UID=$(echo "$response" | sed -n 's/.*"localId":"\([^"]*\)".*/\1/p')
        if [ -n "$TEST_UID" ]; then
            echo "   UID: $TEST_UID"
        fi
        echo -e "${GREEN}✅ Usuário criado com sucesso${NC}"
        return 0
    elif echo "$response" | grep -q "EMAIL_EXISTS"; then
        # Se usuário já existe, buscar uid via signIn para manter seed consistente
        local signin_response=$(curl -s -X POST "http://$EMULATOR_HOST:$FIREBASE_AUTH_PORT/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key" \
          -H "Content-Type: application/json" \
          -d "{
              \"email\": \"$TEST_EMAIL\",
              \"password\": \"$TEST_PASSWORD\",
              \"returnSecureToken\": true
          }" 2>&1)
        TEST_UID=$(echo "$signin_response" | sed -n 's/.*"localId":"\([^"]*\)".*/\1/p')
        if [ -n "$TEST_UID" ]; then
            echo "   UID: $TEST_UID"
        fi
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
    export FIRESTORE_EMULATOR_HOST=$EMULATOR_HOST:$FIRESTORE_PORT
    export FIREBASE_AUTH_EMULATOR_HOST=$EMULATOR_HOST:$FIREBASE_AUTH_PORT
    export E2E_USER_UID="$TEST_UID"

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
    export BASE_URL="http://${WEB_HOST}:${WEB_PORT}"
    export VITE_FIREBASE_AUTH_EMULATOR_HOST=$EMULATOR_HOST:$FIREBASE_AUTH_PORT
    export VITE_FIRESTORE_EMULATOR_HOST=$EMULATOR_HOST:$FIRESTORE_PORT
    export FIREBASE_AUTH_EMULATOR_HOST=$EMULATOR_HOST:$FIREBASE_AUTH_PORT
    export FIRESTORE_EMULATOR_HOST=$EMULATOR_HOST:$FIRESTORE_PORT
    export CI=1

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

start_web_app() {
    echo ""
    echo -e "${BLUE}🌐 Buildando app e iniciando preview estável...${NC}"

    cd "$PROJECT_ROOT"
    export VITE_FIREBASE_AUTH_EMULATOR_HOST=$EMULATOR_HOST:$FIREBASE_AUTH_PORT
    export VITE_FIRESTORE_EMULATOR_HOST=$EMULATOR_HOST:$FIRESTORE_PORT
    export BASE_URL="http://${WEB_HOST}:${WEB_PORT}"

    # Garantir porta limpa para evitar cair em um dev server antigo
    local pids_on_port
    pids_on_port="$(lsof -ti ":${WEB_PORT}" 2>/dev/null || true)"
    if [ -n "$pids_on_port" ]; then
        echo -e "${YELLOW}⚠️  Porta ${WEB_PORT} em uso. Encerrando processo(s): $pids_on_port${NC}"
        echo "$pids_on_port" | xargs -r kill
        sleep 1
    fi

    echo -e "${YELLOW}⏳ Gerando build de produção...${NC}"
    if ! pnpm build >/tmp/fisioflow-e2e-build.log 2>&1; then
        echo -e "${RED}❌ Falha no build da aplicação${NC}"
        echo "Log: /tmp/fisioflow-e2e-build.log"
        tail -n 120 /tmp/fisioflow-e2e-build.log || true
        return 1
    fi
    echo -e "${GREEN}✅ Build concluído${NC}"

    pnpm preview --strictPort --host "$WEB_HOST" --port "$WEB_PORT" >/tmp/fisioflow-e2e-web.log 2>&1 &
    local web_pid=$!
    echo "$web_pid" > "$WEB_PID_FILE"

    if wait_for_http "$BASE_URL" "App Web"; then
        if ! kill -0 "$web_pid" 2>/dev/null; then
            echo -e "${RED}❌ Processo do preview encerrou inesperadamente${NC}"
            echo "Log: /tmp/fisioflow-e2e-web.log"
            tail -n 80 /tmp/fisioflow-e2e-web.log || true
            return 1
        fi
        if ! assert_preview_server; then
            echo "Log: /tmp/fisioflow-e2e-web.log"
            tail -n 80 /tmp/fisioflow-e2e-web.log || true
            return 1
        fi
        echo -e "${GREEN}✅ App web iniciada (PID: $web_pid)${NC}"
        return 0
    else
        echo -e "${RED}❌ Falha ao iniciar app web${NC}"
        echo "Log: /tmp/fisioflow-e2e-web.log"
        tail -n 80 /tmp/fisioflow-e2e-web.log || true
        return 1
    fi
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
    if ! start_web_app; then
        exit 1
    fi

    # 5. Executar testes
    run_tests "$test_spec"
    exit $?
}

# Executar
main "$@"
