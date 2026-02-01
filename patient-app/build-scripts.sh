#!/bin/bash

# FisioFlow Patient App - EAS Build Scripts
# Uso: ./build-scripts.sh [command]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if EAS CLI is installed
check_eas_cli() {
    print_header "Verificando EAS CLI..."

    if ! command -v eas &> /dev/null; then
        print_error "EAS CLI não encontrado"
        echo "Instalando EAS CLI..."
        npm install -g eas-cli
        print_success "EAS CLI instalado"
    else
        print_success "EAS CLI já instalado"
    fi
}

# Check if logged in
check_login() {
    print_header "Verificando login..."

    if eas whoami &> /dev/null; then
        print_success "Logado no EAS"
        eas whoami
    else
        print_error "Não logado no EAS"
        echo "Execute: eas login"
        exit 1
    fi
}

# Development build
build_development() {
    print_header "Build Development (Simulator)"
    eas build --profile development --platform ios
}

# Preview build
build_preview() {
    print_header "Build Preview (Internal Testing)"
    eas build --profile preview --platform ios
}

# TestFlight build
build_testflight() {
    print_header "Build TestFlight"

    print_warning "Certifique-se de que:"
    echo "  1. O app está criado no App Store Connect"
    echo "  2. O eas.json está configurado corretamente"
    echo "  3. Você tem permissões de admin"

    read -p "Continuar? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        eas build --profile testflight --platform ios
    fi
}

# Production build
build_production() {
    print_header "Build Production (App Store)"

    print_warning "Este build será enviado para a App Store!"
    echo "Certifique-se de que:"
    echo "  1. Todas as funcionalidades foram testadas"
    echo "  2. Os screenshots estão prontos"
    echo "  3. A descrição e metadata estão preenchidas"

    read -p "Continuar? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        eas build --profile production --platform ios
    fi
}

# Submit to TestFlight
submit_testflight() {
    print_header "Submeter para TestFlight"
    eas submit --platform ios --profile testflight
}

# Submit to App Store
submit_production() {
    print_header "Submeter para App Store"
    eas submit --platform ios --profile production
}

# List builds
list_builds() {
    print_header "Lista de Builds Recentes"
    eas build:list
}

# Show build info
show_build() {
    if [ -z "$1" ]; then
        print_error "Informe o ID do build"
        echo "Uso: ./build-scripts.sh view [BUILD_ID]"
        exit 1
    fi
    eas build:view $1
}

# Run tests
run_tests() {
    print_header "Executando Testes"
    echo "TODO: Adicionar testes E2E"
    echo "Testes manuais a verificar:"
    echo "  [ ] Fluxo de cadastro"
    echo "  [ ] Login/logout"
    echo "  [ ] Marcar exercícios"
    echo "  [ ] Modo offline"
    echo "  [ ] Notificações"
}

# Pre-build checklist
pre_build_checklist() {
    print_header "Checklist Pré-Build"

    echo -e "\n${YELLOW}Configurações:${NC}"
    echo "  [ ] eas.json configurado corretamente"
    echo "  [ ] Apple ID e Team ID preenchidos"
    echo "  [ ] App criado no App Store Connect"

    echo -e "\n${YELLOW}Conteúdo:${NC}"
    echo "  [ ] Versão atualizada no app.json"
    echo "  [ ] Screenshots prontos (mínimo 3)"
    echo "  [ ] Descrição completa"
    echo "  [ ] Política de privacidade publicada"

    echo -e "\n${YELLOW}Funcionalidades:${NC}"
    echo "  [ ] Login/cadastro funcionando"
    echo "  [ ] Exercícios completando"
    echo "  [ ] Notificações ativadas"
    echo "  [ ] Modo offline sincronizando"

    echo -e "\n${YELLOW}Segurança:${NC}"
    echo "  [ ] Sem dados sensíveis nos logs"
    echo "  [ ] Certificados de push válidos"
    echo "  [ ] Bundle ID correto"

    echo -e "\n${BLUE}Execute 'npm run test' para testes automatizados${NC}"
}

# Show help
show_help() {
    echo -e "${BLUE}FisioFlow Patient App - EAS Build Scripts${NC}"
    echo ""
    echo "Uso: ./build-scripts.sh [command]"
    echo ""
    echo "Comandos:"
    echo "  dev          Build para desenvolvimento (simulator)"
    echo "  preview      Build para preview (dispositivo físico)"
    echo "  testflight   Build para TestFlight"
    echo "  production   Build para App Store"
    echo "  submit-tf    Submeter build para TestFlight"
    echo "  submit-prod  Submeter build para App Store"
    echo "  list         Listar builds recentes"
    echo "  view [id]    Ver detalhes de um build"
    echo "  checklist    Mostrar checklist pré-build"
    echo "  test         Executar testes"
    echo "  help         Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  ./build-scripts.sh dev"
    echo "  ./build-scripts.sh testflight"
    echo "  ./build-scripts.sh view abc123"
}

# Main
case "$1" in
    dev)
        check_eas_cli
        check_login
        build_development
        ;;
    preview)
        check_eas_cli
        check_login
        build_preview
        ;;
    testflight)
        check_eas_cli
        check_login
        pre_build_checklist
        build_testflight
        ;;
    production)
        check_eas_cli
        check_login
        pre_build_checklist
        build_production
        ;;
    submit-tf)
        check_eas_cli
        check_login
        submit_testflight
        ;;
    submit-prod)
        check_eas_cli
        check_login
        submit_production
        ;;
    list)
        check_eas_cli
        check_login
        list_builds
        ;;
    view)
        check_eas_cli
        check_login
        show_build $2
        ;;
    checklist)
        pre_build_checklist
        ;;
    test)
        run_tests
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Comando inválido"
        echo ""
        show_help
        exit 1
        ;;
esac

print_success "Script concluído!"
