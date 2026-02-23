#!/bin/bash

# FisioFlow - Script de Setup de Segredos do Google Cloud Secret Manager
# Free Tier: 6 versões ativas de segredos gratuitas
# Docs: https://cloud.google.com/secret-manager/docs

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}
REGION=${REGION:-southamerica-east1}

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Erro: PROJECT_ID não definido${NC}"
    echo "Defina GOOGLE_CLOUD_PROJECT ou configure o gcloud: gcloud config set project PROJECT_ID"
    exit 1
fi

echo -e "${BLUE}FisioFlow Secret Manager Setup${NC}"
echo -e "Project: ${GREEN}${PROJECT_ID}${NC}"
echo -e "Region: ${GREEN}${REGION}${NC}"
echo ""

# Função para criar/atualizar segredo
create_or_update_secret() {
    local secret_name=$1
    local prompt=$2
    local file_path=$3
    local from_file=${4:-false}

    echo -e "${YELLOW}Configurando: ${secret_name}${NC}"

    if $from_file; then
        if [ ! -f "$file_path" ]; then
            echo -e "${RED}Erro: Arquivo não encontrado: $file_path${NC}"
            return 1
        fi
        value=$(cat "$file_path")
    else
        echo -n "$prompt: "
        read -s value
        echo ""
    fi

    if [ -z "$value" ]; then
        echo -e "${YELLOW}Pulando (vazio)${NC}"
        return 0
    fi

    # Verificar se segredo existe
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        echo "Atualizando segredo existente..."
        echo -n "$value" | gcloud secrets versions add "$secret_name" \
            --data-file=- \
            --project="$PROJECT_ID"
    else
        echo "Criando novo segredo..."
        echo -n "$value" | gcloud secrets create "$secret_name" \
            --data-file=- \
            --project="$PROJECT_ID" \
            --replication-policy=automatic
    fi

    echo -e "${GREEN}✓ Segredo configurado${NC}"
    echo ""
}

# Menu de opções
menu() {
    echo -e "${BLUE}Escolha uma opção:${NC}"
    echo "1) Database Secrets"
    echo "2) Communication Secrets (Email, WhatsApp)"
    echo "3) AI/ML Secrets (Gemini, OpenAI, etc)"
    echo "4) Payment Secrets (Stripe)"
    echo "5) Google Integration Secrets"
    echo "6) Security Secrets"
    echo "7) Todos os segredos"
    echo "8) Listar segredos existentes"
    echo "9) Deletar um segredo"
    echo "0) Sair"
    echo ""
    echo -n "Opção: "
    read -r choice
}

# Database Secrets
setup_database_secrets() {
    echo -e "${BLUE}=== Database Secrets ===${NC}"
    create_or_update_secret "DB_PASS" "DB Password"
    create_or_update_secret "DB_USER" "DB Username"
    create_or_update_secret "DB_NAME" "DB Name"
    create_or_update_secret "DB_HOST_IP" "DB Host IP"
    create_or_update_secret "DB_HOST_IP_PUBLIC" "DB Host IP (Public)"
    create_or_update_secret "CLOUD_SQL_CONNECTION_NAME" "Cloud SQL Connection Name"
}

# Communication Secrets
setup_communication_secrets() {
    echo -e "${BLUE}=== Communication Secrets ===${NC}"
    create_or_update_secret "RESEND_API_KEY" "Resend API Key"
    create_or_update_secret "WHATSAPP_ACCESS_TOKEN" "WhatsApp Access Token"
    create_or_update_secret "WHATSAPP_PHONE_NUMBER_ID" "WhatsApp Phone Number ID"
    create_or_update_secret "WHATSAPP_VERIFY_TOKEN" "WhatsApp Verify Token"
    create_or_update_secret "WHATSAPP_API_URL" "WhatsApp API URL"
}

# AI/ML Secrets
setup_ai_secrets() {
    echo -e "${BLUE}=== AI/ML Secrets ===${NC}"
    create_or_update_secret "GEMINI_API_KEY" "Gemini API Key"
    create_or_update_secret "OPENAI_API_KEY" "OpenAI API Key"
    create_or_update_secret "ANTHROPIC_API_KEY" "Anthropic API Key"
    create_or_update_secret "XAI_API_KEY" "xAI API Key"
}

# Payment Secrets
setup_payment_secrets() {
    echo -e "${BLUE}=== Payment Secrets ===${NC}"
    create_or_update_secret "STRIPE_SECRET_KEY" "Stripe Secret Key"
    create_or_update_secret "STRIPE_WEBHOOK_SECRET" "Stripe Webhook Secret"
    create_or_update_secret "STRIPE_PUBLISHABLE_KEY" "Stripe Publishable Key"
}

# Google Integration Secrets
setup_google_secrets() {
    echo -e "${BLUE}=== Google Integration Secrets ===${NC}"
    create_or_update_secret "GOOGLE_CLIENT_ID" "Google Client ID"
    create_or_update_secret "GOOGLE_CLIENT_SECRET" "Google Client Secret"
    create_or_update_secret "GOOGLE_CALENDAR_WEBHOOK_SECRET" "Google Calendar Webhook Secret"
}

# Security Secrets
setup_security_secrets() {
    echo -e "${BLUE}=== Security Secrets ===${NC}"
    create_or_update_secret "CRON_SECRET" "Cron Secret (use: openssl rand -base64 32)"
    create_or_update_secret "API_SECRET_KEY" "API Secret Key (use: openssl rand -base64 32)"
    create_or_update_secret "JWT_SECRET" "JWT Secret (use: openssl rand -base64 32)"
    create_or_update_secret "ENCRYPTION_KEY" "Encryption Key (use: openssl rand -hex 32)"
}

# Listar segredos
list_secrets() {
    echo -e "${BLUE}=== Segredos Existentes ===${NC}"
    gcloud secrets list --project="$PROJECT_ID"
    echo ""
}

# Deletar segredo
delete_secret() {
    echo -e "${BLUE}=== Deletar Segredo ===${NC}"
    echo -n "Nome do segredo: "
    read -r secret_name

    if [ -z "$secret_name" ]; then
        echo -e "${RED}Nome não pode ser vazio${NC}"
        return 1
    fi

    echo -e "${YELLOW}AVISO: Esta ação não pode ser desfeita!${NC}"
    echo -n "Confirmar deleção de '$secret_name'? (yes/no): "
    read -r confirm

    if [ "$confirm" = "yes" ]; then
        gcloud secrets delete "$secret_name" --project="$PROJECT_ID"
        echo -e "${GREEN}Segredo deletado${NC}"
    else
        echo -e "${YELLOW}Cancelado${NC}"
    fi
}

# Main loop
while true; do
    menu

    case $choice in
        1) setup_database_secrets ;;
        2) setup_communication_secrets ;;
        3) setup_ai_secrets ;;
        4) setup_payment_secrets ;;
        5) setup_google_secrets ;;
        6) setup_security_secrets ;;
        7)
            setup_database_secrets
            setup_communication_secrets
            setup_ai_secrets
            setup_payment_secrets
            setup_google_secrets
            setup_security_secrets
            ;;
        8) list_secrets ;;
        9) delete_secret ;;
        0) echo -e "${GREEN}Saindo...${NC}"; exit 0 ;;
        *) echo -e "${RED}Opção inválida${NC}" ;;
    esac

    echo ""
    echo -n "Pressione Enter para continuar..."
    read -r
    clear
done
