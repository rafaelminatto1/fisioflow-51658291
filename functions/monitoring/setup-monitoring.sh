#!/bin/bash

# Script para configurar alertas do Cloud Monitoring
# Projeto: fisioflow-migration

set -e

PROJECT_ID="fisioflow-migration"
REGION="us-central1"

echo "🔧 Configurando Cloud Monitoring para FisioFlow..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para criar um canal de notificação por email
setup_email_notification() {
  local EMAIL=${1:-"admin@fisioflow.com.br"}

  echo -e "${YELLOW}📧 Criando canal de notificação por email...${NC}"

  gcloud alpha monitoring channels create \
    --display-name="FisioFlow Alerts" \
    --type=email \
    --channel-labels=email_address="$EMAIL" \
    --project="$PROJECT_ID" 2>/dev/null || echo "Canal de email já existe ou não foi possível criar"

  echo -e "${GREEN}✓ Canal de notificação configurado${NC}"
}

# Função para criar alerta de taxa de erro alta
create_error_rate_alert() {
  echo -e "${YELLOW}⚠️  Criando alerta de alta taxa de erro...${NC}"

  gcloud alpha monitoring policies create \
    --project="$PROJECT_ID" \
    --policy-from-file="monitoring/error-rate-policy.yaml" 2>/dev/null || \
  gcloud monitoring policies create \
    --project="$PROJECT_ID" \
    --display-name="Alta Taxa de Erro - Cloud Functions" \
    --conditions='display_name="High Error Rate"
condition_threshold.filter="resource.type=\"cloud_function\" metric.type=\"cloudfunctions.googleapis.com/function/execution_count\" metric.labels.\"execution_status\"=\"execution_status\""
conditionThreshold.comparison=COMPARISON_GT
conditionThreshold.duration=300s
conditionThreshold.aggregings.alignmentPeriod=300s
conditionThreshold.aggregings.perSeriesAligner=ALIGN_FRACTION_TRUE
conditionThreshold.thresholdValue=0.05' \
    --documentation-content="A taxa de erro das Cloud Functions está acima de 5%. Verifique os logs para identificar o problema." \
    --severity="WARNING" \
    --enabled || echo "Alerta já existe"

  echo -e "${GREEN}✓ Alerta de taxa de erro criado${NC}"
}

# Função para criar alerta de latência alta
create_latency_alert() {
  echo -e "${YELLOW}⏱️  Criando alerta de alta latência...${NC}"

  gcloud monitoring policies create \
    --project="$PROJECT_ID" \
    --display-name="Alta Latência - Cloud Functions" \
    --conditions='display_name="High Latency"
conditionThreshold.filter="resource.type=\"cloud_function\" metric.type=\"cloudfunctions.googleapis.com/function/execution_times\""
conditionThreshold.comparison=COMPARISON_GT
conditionThreshold.duration=300s
conditionThreshold.aggregings.alignmentPeriod=300s
conditionThreshold.aggregings.perSeriesAligner=ALIGN_PERCENTILE_99
conditionThreshold.thresholdValue=10000' \
    --documentation-content="O tempo de execução das Cloud Functions está acima de 10 segundos (p99)." \
    --severity="WARNING" \
    --enabled || echo "Alerta já existe"

  echo -e "${GREEN}✓ Alerta de latência criado${NC}"
}

# Função para criar alerta de quota excedida
create_quota_alert() {
  echo -e "${YELLOW}📊 Criando alerta de quota excedida...${NC}"

  gcloud monitoring policies create \
    --project="$PROJECT_ID" \
    --display-name="Quota Excedida - Cloud Functions" \
    --conditions='display_name="Quota Exceeded"
conditionThreshold.filter="resource.type=\"cloud_function\" metric.type=\"cloudfunctions.googleapis.com/function/execution_count\" metric.labels.\"response_code\"=\"429\""
conditionThreshold.comparison=COMPARISON_GT
conditionThreshold.duration=60s
conditionThreshold.aggregings.alignmentPeriod=60s
conditionThreshold.aggregings.perSeriesAligner=ALIGN_COUNT
conditionThreshold.thresholdValue=0' \
    --documentation-content="A quota de Cloud Functions foi excedida. Considere aumentar a quota ou implementar rate limiting." \
    --severity="CRITICAL" \
    --alert-strategy-auto-close=1800s \
    --enabled || echo "Alerta já existe"

  echo -e "${GREEN}✓ Alerta de quota criado${NC}"
}

# Função para criar dashboard personalizado
create_dashboard() {
  echo -e "${YELLOW}📈 Criando dashboard de monitoramento...${NC}"

  gcloud monitoring dashboards create \
    --project="$PROJECT_ID" \
    --display-name="FisioFlow Overview" \
    --config-from-file=monitoring/dashboard.json 2>/dev/null || echo "Dashboard já existe"

  echo -e "${GREEN}✓ Dashboard criado${NC}"
}

# Função para habilitar APIs necessárias
enable_apis() {
  echo -e "${YELLOW}🔌 Habilitando APIs do Cloud Monitoring...${NC}"

  gcloud services enable \
    monitoring.googleapis.com \
    cloudmonitoring.googleapis.com \
    cloudtrace.googleapis.com \
    logging.googleapis.com \
    clouderrorreporting.googleapis.com \
    --project="$PROJECT_ID"

  echo -e "${GREEN}✓ APIs habilitadas${NC}"
}

# Função principal
main() {
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  FisioFlow - Setup de Monitoramento${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""

  # Verificar se gcloud está autenticado
  if ! gcloud auth list --filter="status:ACTIVE" 2>/dev/null | grep -q "."; then
    echo -e "${RED}❌ Erro: gcloud não está autenticado${NC}"
    echo "Execute: gcloud auth login"
    exit 1
  fi

  # Executar configurações
  enable_apis
  setup_email_notification "admin@fisioflow.com.br"
  create_error_rate_alert
  create_latency_alert
  create_quota_alert
  create_dashboard

  echo ""
  echo -e "${GREEN}✅ Configuração de monitoramento concluída!${NC}"
  echo ""
  echo "📊 Dashboard disponível em:"
  echo "   https://console.cloud.google.com/monitoring/dashboards?project=$PROJECT_ID"
  echo ""
  echo "🔔 Alertas disponíveis em:"
  echo "   https://console.cloud.google.com/monitoring/alerting?project=$PROJECT_ID"
  echo ""
  echo "📋 Logs disponíveis em:"
  echo "   https://console.cloud.google.com/logs?project=$PROJECT_ID"
}

# Executar script
main "$@"
