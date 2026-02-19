#!/bin/bash

# Script para configurar CORS nas Cloud Functions (Cloud Run)
# Uso: bash scripts/fix-cors-cloud-run.sh

set -e

echo "🔧 Configurando CORS nas Cloud Functions do Firebase"
echo "===================================================="
echo ""

# Configurações
PROJECT_ID="fisioflow-migration"
REGION="southamerica-east1"
# Usar apenas * para desenvolvimento (permite todas as origens)
ALLOWED_ORIGINS="*"

# Lista de serviços para configurar
SERVICES=(
  "appointmentservicehttp"
  "patientservicehttp"
  "evolutionservicehttp"
)

echo "📋 Projeto: $PROJECT_ID"
echo "📍 Região: $REGION"
echo "🌐 Origens permitidas: $ALLOWED_ORIGINS"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI não está instalado!"
    echo "   Instale com: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✅ gcloud CLI encontrado"
echo ""

# Verificar autenticação
echo "🔐 Verificando autenticação..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "❌ Você não está autenticado no gcloud!"
    echo "   Execute: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "✅ Autenticado como: $ACTIVE_ACCOUNT"
echo ""

# Configurar projeto
echo "🔧 Configurando projeto..."
gcloud config set project $PROJECT_ID
echo ""

# Função para atualizar serviço com CORS
update_service_cors() {
  local SERVICE_NAME=$1
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Configurando CORS para: $SERVICE_NAME"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Verificar se o serviço existe
  if ! gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &> /dev/null; then
    echo "⚠️  Serviço $SERVICE_NAME não encontrado. Pulando..."
    echo ""
    return
  fi
  
  echo "✅ Serviço encontrado"
  
  # Atualizar serviço com variáveis de ambiente para CORS
  echo "🔄 Atualizando configuração..."
  
  gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --update-env-vars=CORS_ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
    --quiet
  
  if [ $? -eq 0 ]; then
    echo "✅ CORS configurado com sucesso para $SERVICE_NAME"
  else
    echo "❌ Erro ao configurar CORS para $SERVICE_NAME"
  fi
  
  echo ""
}

# Atualizar cada serviço
for SERVICE in "${SERVICES[@]}"; do
  update_service_cors $SERVICE
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuração de CORS concluída!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   As variáveis de ambiente foram configuradas, mas as Cloud Functions"
echo "   precisam estar programadas para usar essas variáveis."
echo ""
echo "   Se os erros de CORS persistirem, você precisa atualizar o código"
echo "   das Cloud Functions para ler a variável CORS_ALLOWED_ORIGINS"
echo "   e configurar os headers CORS apropriadamente."
echo ""
echo "📝 Próximos passos:"
echo "   1. Aguarde 1-2 minutos para as mudanças propagarem"
echo "   2. Recarregue a aplicação: http://localhost:5175"
echo "   3. Verifique se os erros de CORS desapareceram"
echo ""
echo "🔍 Para verificar a configuração:"
echo "   gcloud run services describe appointmentservicehttp --region=$REGION --project=$PROJECT_ID"
echo ""
