#!/bin/bash

# Setup Vercel Environment Variables - Non-interactive
# Este script usa a API da Vercel para configurar variáveis sem interação

set -e

PROJECT_ID="fisioflow-51658291"
TEAM_ID=""

echo "🔧 Configurando variáveis na Vercel..."
echo ""

# Verificar se temos vercel CLI instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instalando..."
    npm install -g vercel
fi

echo "📦 Configurando Inngest..."
echo ""

# INNGEST_EVENT_KEY
echo "  - INNGEST_EVENT_KEY"
vercel env add INNGEST_EVENT_KEY production ***REMOVED*** 2>/dev/null || echo "    (já existe ou erro - ignorando)"

# INNGEST_SIGNING_KEY
echo "  - INNGEST_SIGNING_KEY"
vercel env add INNGEST_SIGNING_KEY production ***REMOVED*** 2>/dev/null || echo "    (já existe ou erro - ignorando)"

# RESEND_API_KEY
echo "  - RESEND_API_KEY"
vercel env rm RESEND_API_KEY production --yes 2>/dev/null || true
vercel env add RESEND_API_KEY production ***REMOVED*** 2>/dev/null || echo "    (já existe ou erro - ignorando)"

echo ""
echo "✅ Variáveis de Inngest e Resend configuradas!"
echo ""
echo "⚠️  Agora configure o Evolution API:"
echo ""
echo "1. Acesse: http://localhost:8443"
echo "2. Crie uma instância"
echo "3. Conecte o WhatsApp (QR Code)"
echo "4. Copie a API Key"
echo "5. Adicione na Vercel:"
echo ""
echo "   vercel env add WHATSAPP_API_URL production http://seu-servidor:8443"
echo "   vercel env add WHATSAPP_API_KEY production SUA_API_KEY"
echo ""
echo "6. Deploy:"
echo "   vercel --prod"
echo ""
