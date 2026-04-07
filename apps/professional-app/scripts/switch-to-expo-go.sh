#!/bin/bash

echo "🔄 Alternando para modo Expo Go..."

SCRIPT_DIR="$(cd "$(dirname "$0")")"

echo "📦 Instalando dependências compatíveis com Expo Go..."
pnpm install --filter "@fisioflow/professional-app..." 2>/dev/null

echo ""
echo "✅ Modo Expo Go configurado!"
echo ""
echo "📱 Para rodar no Expo Go:"
echo "   cd apps/professional-app"
echo "   npx expo start"
echo ""
echo "🔙 Para voltar ao Dev Build:"
echo "   ./scripts/switch-to-dev-build.sh"
