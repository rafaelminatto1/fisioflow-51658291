#!/bin/bash

# Script para verificar status dos índices do Firestore
# Uso: ./scripts/check-firestore-indexes.sh

PROJECT_ID="fisioflow-migration"
DATABASE="(default)"

echo "🔍 Verificando status dos índices do Firestore..."
echo ""

# Buscar índices em CREATING
CREATING=$(gcloud firestore indexes composite list \
  --project=$PROJECT_ID \
  --database="$DATABASE" \
  --filter="state:CREATING" \
  --format="value(name)" 2>/dev/null)

if [ -z "$CREATING" ]; then
  echo "✅ Todos os índices estão READY!"
  exit 0
fi

CREATING_COUNT=$(echo "$CREATING" | wc -l)
echo "⏳ Índices em CREATING: $CREATING_COUNT"
echo ""

# Mostrar detalhes dos índices em construção
echo "📋 Detalhes dos índices sendo construídos:"
echo ""

gcloud firestore indexes composite list \
  --project=$PROJECT_ID \
  --database="$DATABASE" \
  --filter="state:CREATING" \
  --format="table(name,collectionGroup,state)" 2>/dev/null

echo ""
echo "💡 Os índices podem levar alguns minutos para serem construídos."
echo "   Execute este script novamente para verificar o progresso."
echo ""
echo "📊 Para ver todos os índices:"
echo "   gcloud firestore indexes composite list --project=$PROJECT_ID --database='$DATABASE'"
