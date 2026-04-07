#!/bin/bash
echo "🔄 Alternando para modo Development Build"

SCRIPT_DIR="$(cd "$(dirname "$0")")"

echo "📦 Restaurando backups se existirem"
if [ -f "package.json.backup" ]; then
  cp package.json.backup package.json
  echo "✅ package.json restaurado"
fi

if [ -f "app.json.backup" ]; then
  cp app.json.backup app.json
  echo "✅ app.json restaurado"
fi

echo "📦 Instalando dependências do Dev Build..."
pnpm install --filter "@fisioflow/professional-app..."

echo "✅ Modo Development Build configurado!"
echo ""
echo "🏗️  Para criar Development Build:"
echo "   npx expo run:ios"
echo "   ou"
echo "   npx expo run:android"
echo ""
echo "🔙 Para voltar ao Expo Go:"
echo "   ./scripts/switch-to-expo-go.sh"
