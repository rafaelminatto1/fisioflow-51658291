#!/bin/bash
# Script para executar testes E2E com Playwright em ambiente CI/CD
# Uso: ./scripts/run-e2e-tests.sh [options]
#
# Opções:
#   --headed           Executa testes em modo headed (com janela gráfica)
#   --debug            Executa testes em modo debug
#   --spec=<arquivo>   Executa apenas um arquivo de teste específico
#   --workers=<num>    Número de workers (padrão: 1)
#   --update-snapshots Atualiza snapshots
#   --no-server        Não inicia o servidor de desenvolvimento
#
# Exemplos:
#   ./scripts/run-e2e-tests.sh
#   ./scripts/run-e2e-tests.sh --spec=e2e/auth.spec.ts
#   ./scripts/run-e2e-tests.sh --headed --workers=1

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações padrão
DEV_SERVER_PORT=${DEV_SERVER_PORT:-8084}
DEV_SERVER_HOST=${DEV_SERVER_HOST:-127.0.0.0}
E2E_BASE_URL="http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}"
PLAYWRIGHT_WORKERS=${PLAYWRIGHT_WORKERS:-1}
HEADED=false
DEBUG=false
SPEC_FILE=""
UPDATE_SNAPSHOTS=false
START_SERVER=true

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} ✓ $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} ⚠ $1"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')]${NC} ✗ $1"
}

# Função para matar processos em background
cleanup() {
    log "Limppeza..."

    if [ -n "$DEV_SERVER_PID" ] && kill -0 $DEV_SERVER_PID 2>/dev/null; then
        log "Parando servidor de desenvolvimento (PID: $DEV_SERVER_PID)..."
        kill $DEV_SERVER_PID 2>/dev/null || true
        wait $DEV_SERVER_PID 2>/dev/null || true
    fi

    # Remover arquivos de PID temporários
    rm -f /tmp/dev-server.pid

    log "Limpeza concluída"
}

# Trap para garantir cleanup ao sair
trap cleanup EXIT INT TERM

# Função para aguardar servidor estar pronto
wait_for_server() {
    local url=$1
    local max_wait=${2:-60}
    local counter=0

    log "Aguardando servidor em $url..."

    while [ $counter -lt $max_wait ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            log_success "Servidor está pronto!"
            return 0
        fi
        counter=$((counter + 1))
        sleep 1
    done

    log_error "Servidor não iniciou após ${max_wait}s"
    return 1
}

# Função para verificar dependências
check_dependencies() {
    log "Verificando dependências..."

    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado. Por favor, instale o Node.js."
        exit 1
    fi

    # Verificar pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm não encontrado. Por favor, instale o pnpm."
        exit 1
    fi

    # Verificar se node_modules existe
    if [ ! -d "node_modules" ]; then
        log "node_modules não encontrado. Executando pnpm install..."
        pnpm install
    fi

    # Verificar se Playwright está instalado
    if ! npx playwright --version &> /dev/null; then
        log "Playwright não encontrado. Executando pnpm install..."
        pnpm install
    fi

    log_success "Dependências verificadas"
}

# Função para iniciar servidor de desenvolvimento
start_dev_server() {
    log "Iniciando servidor de desenvolvimento na porta $DEV_SERVER_PORT..."

    # Configurar variáveis de ambiente para teste
    export BASE_URL="$E2E_BASE_URL"

    # Iniciar servidor em background
    pnpm dev --port $DEV_SERVER_PORT > /tmp/dev-server.log 2>&1 &
    DEV_SERVER_PID=$!
    echo $DEV_SERVER_PID > /tmp/dev-server.pid

    # Aguardar servidor estar pronto
    wait_for_server "$E2E_BASE_URL" 60

    log_success "Servidor de desenvolvimento iniciado (PID: $DEV_SERVER_PID)"
}

# Função para executar testes
run_tests() {
    local test_args=""

    if [ "$HEADED" = true ]; then
        test_args="$test_args --headed"
    fi

    if [ "$DEBUG" = true ]; then
        test_args="$test_args --debug"
    fi

    if [ -n "$SPEC_FILE" ]; then
        test_args="$test_args $SPEC_FILE"
    else
        test_args="$test_args e2e"
    fi

    if [ "$UPDATE_SNAPSHOTS" = true ]; then
        test_args="$test_args --update-snapshots"
    fi

    test_args="$test_args --project=chromium --workers=$PLAYWRIGHT_WORKERS"

    log "Executando testes E2E..."
    log "Comando: npx playwright test $test_args"

    # Executar testes
    if npx playwright test $test_args; then
        log_success "Testes E2E passaram!"
        return 0
    else
        log_error "Testes E2E falharam!"
        return 1
    fi
}

# Parse argumentos da linha de comando
parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            --headed)
                HEADED=true
                shift
                ;;
            --debug)
                DEBUG=true
                shift
                ;;
            --spec=*)
                SPEC_FILE="${1#*=}"
                shift
                ;;
            --workers=*)
                PLAYWRIGHT_WORKERS="${1#*=}"
                shift
                ;;
            --update-snapshots)
                UPDATE_SNAPSHOTS=true
                shift
                ;;
            --no-server)
                START_SERVER=false
                shift
                ;;
            -h|--help)
                echo "Uso: $0 [opções]"
                echo ""
                echo "Opções:"
                echo "  --headed           Executa testes em modo headed (com janela gráfica)"
                echo "  --debug            Executa testes em modo debug"
                echo "  --spec=<arquivo>   Executa apenas um arquivo de teste específico"
                echo "  --workers=<num>    Número de workers (padrão: 1)"
                echo "  --update-snapshots Atualiza snapshots"
                echo "  --no-server        Não inicia o servidor de desenvolvimento"
                echo "  -h, --help         Mostra esta ajuda"
                exit 0
                ;;
            *)
                log_error "Opção desconhecida: $1"
                echo "Use --help para ver as opções disponíveis"
                exit 1
                ;;
        esac
    done
}

# Main
main() {
    log "=========================================="
    log "  Testes E2E - FisioFlow AI Studio"
    log "=========================================="
    log ""

    # Parse argumentos
    parse_args "$@"

    # Verificar dependências
    check_dependencies

    if [ "$START_SERVER" = true ]; then
        start_dev_server
    fi

    # Executar testes
    run_tests

    # Exit com o código de retorno dos testes
    exit $?
}

# Executar main
main "$@"
