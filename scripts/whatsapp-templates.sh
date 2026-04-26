#!/usr/bin/env bash
# =============================================================================
# FisioFlow — Gerenciador de Templates WhatsApp via Meta Graph API
# =============================================================================
# Uso:
#   ./scripts/whatsapp-templates.sh listar
#   ./scripts/whatsapp-templates.sh criar <arquivo.json>
#   ./scripts/whatsapp-templates.sh deletar <nome_do_template>
#   ./scripts/whatsapp-templates.sh status <nome_do_template>
#   ./scripts/whatsapp-templates.sh criar-todos
#
# Pré-requisitos:
#   export WHATSAPP_ACCESS_TOKEN="seu_token_aqui"
#   export WHATSAPP_WABA_ID="seu_waba_id_aqui"
#   (ou preencha as variáveis abaixo diretamente)
# =============================================================================

set -euo pipefail

# ── Credenciais ──────────────────────────────────────────────────────────────
# Preencha aqui ou exporte como variáveis de ambiente antes de rodar
TOKEN="${WHATSAPP_ACCESS_TOKEN:-}"
WABA_ID="${WHATSAPP_WABA_ID:-}"
API_VERSION="v21.0"
BASE_URL="https://graph.facebook.com/${API_VERSION}"

# ── Validação ────────────────────────────────────────────────────────────────
if [[ -z "$TOKEN" ]]; then
  echo "❌ WHATSAPP_ACCESS_TOKEN não definido."
  echo "   Execute: export WHATSAPP_ACCESS_TOKEN='seu_token'"
  echo "   O token está em: Meta Business → WhatsApp → Configurações → Token de acesso"
  exit 1
fi

if [[ -z "$WABA_ID" ]]; then
  echo "❌ WHATSAPP_WABA_ID não definido."
  echo "   Execute: export WHATSAPP_WABA_ID='seu_waba_id'"
  echo "   O WABA ID está em: Meta Business → WhatsApp → Configurações da conta"
  exit 1
fi

# ── Funções ──────────────────────────────────────────────────────────────────

listar() {
  echo "📋 Listando templates da conta WABA ${WABA_ID}..."
  curl -s \
    "${BASE_URL}/${WABA_ID}/message_templates?fields=name,status,category,language,components&limit=50" \
    -H "Authorization: Bearer ${TOKEN}" \
    | python3 -m json.tool 2>/dev/null || cat
}

status_template() {
  local nome="$1"
  echo "🔍 Buscando status do template '${nome}'..."
  curl -s \
    "${BASE_URL}/${WABA_ID}/message_templates?name=${nome}&fields=name,status,category,language,rejected_reason" \
    -H "Authorization: Bearer ${TOKEN}" \
    | python3 -m json.tool 2>/dev/null || cat
}

criar_template() {
  local arquivo="$1"
  if [[ ! -f "$arquivo" ]]; then
    echo "❌ Arquivo não encontrado: $arquivo"
    exit 1
  fi
  echo "🚀 Criando template a partir de ${arquivo}..."
  curl -s -X POST \
    "${BASE_URL}/${WABA_ID}/message_templates" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d @"${arquivo}" \
    | python3 -m json.tool 2>/dev/null || cat
}

deletar_template() {
  local nome="$1"
  echo "🗑️  Deletando template '${nome}'..."
  curl -s -X DELETE \
    "${BASE_URL}/${WABA_ID}/message_templates?name=${nome}" \
    -H "Authorization: Bearer ${TOKEN}" \
    | python3 -m json.tool 2>/dev/null || cat
}

criar_todos() {
  echo "🚀 Criando todos os 6 templates do FisioFlow..."
  local dir="scripts/whatsapp-template-payloads"
  mkdir -p "$dir"

  # Gerar os arquivos JSON de cada template
  cat > "${dir}/appointment_reminder_d3.json" << 'EOF'
{
  "name": "appointment_reminder_d3",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Olá, {{1}}! Passando para lembrar da sua sessão de fisioterapia na {{2}} em *{{3}}* às *{{4}}*.\n\nEstá tudo certo para comparecer? Responda *Sim* para confirmar ou *Reagendar* se precisar mudar o horário.",
      "example": {
        "body_text": [["Maria", "Clínica Moocafisio", "28/04", "14:30"]]
      }
    }
  ]
}
EOF

  cat > "${dir}/appointment_reminder_d1.json" << 'EOF'
{
  "name": "appointment_reminder_d1",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Oi, {{1}}! Sua sessão de fisioterapia é *amanhã* ({{2}}) às *{{3}}*.\n\nResponda *Confirmar* ou *Cancelar* — sem resposta assumimos presença.",
      "example": {
        "body_text": [["João", "quinta-feira", "10:00"]]
      }
    }
  ]
}
EOF

  cat > "${dir}/appointment_reminder_d0.json" << 'EOF'
{
  "name": "appointment_reminder_d0",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "{{1}}, lembrete rápido: sua sessão de fisioterapia é *hoje às {{2}}*.\n\nTe esperamos em {{3}}. Qualquer imprevisto, nos avise por aqui.",
      "example": {
        "body_text": [["Ana", "16:00", "Rua X, 123"]]
      }
    }
  ]
}
EOF

  cat > "${dir}/confirmation_request.json" << 'EOF'
{
  "name": "confirmation_request",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Olá, {{1}}. Sua sessão está marcada para *{{2}}* às *{{3}}*.\n\nPor favor, responda *Confirmar* ou *Reagendar* para ajustarmos a agenda.",
      "example": {
        "body_text": [["Carlos", "29/04 (segunda)", "08:30"]]
      }
    }
  ]
}
EOF

  cat > "${dir}/reschedule_followup.json" << 'EOF'
{
  "name": "reschedule_followup",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Olá, {{1}}. Recebemos seu pedido de reagendamento.\n\nTenho estas opções disponíveis:\n1. {{2}}\n2. {{3}}\n3. {{4}}\n\nResponda com o número da opção preferida.",
      "example": {
        "body_text": [["Beatriz", "seg 28/04 às 10:00", "ter 29/04 às 14:30", "qua 30/04 às 17:00"]]
      }
    }
  ]
}
EOF

  cat > "${dir}/cancellation_confirmation.json" << 'EOF'
{
  "name": "cancellation_confirmation",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "{{1}}, seu cancelamento da sessão de *{{2}}* às *{{3}}* foi registrado.\n\nQuando quiser remarcar, é só nos enviar uma mensagem aqui. Cuide-se!",
      "example": {
        "body_text": [["Pedro", "28/04", "14:00"]]
      }
    }
  ]
}
EOF

  local templates=(
    "appointment_reminder_d3"
    "appointment_reminder_d1"
    "appointment_reminder_d0"
    "confirmation_request"
    "reschedule_followup"
    "cancellation_confirmation"
  )

  local sucesso=0
  local falha=0

  for nome in "${templates[@]}"; do
    echo ""
    echo "──────────────────────────────────────"
    echo "📤 Enviando: ${nome}"
    local resposta
    resposta=$(curl -s -X POST \
      "${BASE_URL}/${WABA_ID}/message_templates" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d @"${dir}/${nome}.json")

    echo "$resposta" | python3 -m json.tool 2>/dev/null || echo "$resposta"

    if echo "$resposta" | grep -q '"id"'; then
      echo "✅ ${nome} — enviado para aprovação"
      ((sucesso++))
    else
      echo "❌ ${nome} — falhou"
      ((falha++))
    fi
  done

  echo ""
  echo "══════════════════════════════════════"
  echo "Resultado: ${sucesso} enviados, ${falha} com erro"
  echo "Aprovação Meta: 24–72h (geralmente <24h)"
  echo ""
  echo "Para verificar status depois:"
  echo "  ./scripts/whatsapp-templates.sh listar"
}

# ── Roteamento de comandos ────────────────────────────────────────────────────
COMANDO="${1:-ajuda}"

case "$COMANDO" in
  listar)
    listar
    ;;
  status)
    [[ -z "${2:-}" ]] && { echo "Uso: $0 status <nome_do_template>"; exit 1; }
    status_template "$2"
    ;;
  criar)
    [[ -z "${2:-}" ]] && { echo "Uso: $0 criar <arquivo.json>"; exit 1; }
    criar_template "$2"
    ;;
  deletar)
    [[ -z "${2:-}" ]] && { echo "Uso: $0 deletar <nome_do_template>"; exit 1; }
    echo "⚠️  Tem certeza que quer deletar '${2}'? Templates deletados não podem ser recuperados."
    read -r -p "Digite 'sim' para confirmar: " confirmacao
    [[ "$confirmacao" == "sim" ]] && deletar_template "$2" || echo "Cancelado."
    ;;
  criar-todos)
    criar_todos
    ;;
  ajuda|--help|-h|*)
    echo ""
    echo "FisioFlow — Gerenciador de Templates WhatsApp"
    echo ""
    echo "Uso:"
    echo "  export WHATSAPP_ACCESS_TOKEN='seu_token'"
    echo "  export WHATSAPP_WABA_ID='seu_waba_id'"
    echo ""
    echo "  ./scripts/whatsapp-templates.sh listar          # Lista todos os templates"
    echo "  ./scripts/whatsapp-templates.sh status <nome>   # Status de um template"
    echo "  ./scripts/whatsapp-templates.sh criar <json>    # Cria a partir de arquivo JSON"
    echo "  ./scripts/whatsapp-templates.sh deletar <nome>  # Deleta um template"
    echo "  ./scripts/whatsapp-templates.sh criar-todos     # Cria os 6 templates do FisioFlow"
    echo ""
    echo "Onde encontrar as credenciais:"
    echo "  TOKEN:   Meta Business → WhatsApp → Configurações → Token de acesso permanente"
    echo "  WABA_ID: Meta Business → WhatsApp → Configurações da conta → ID da conta"
    echo ""
    ;;
esac
