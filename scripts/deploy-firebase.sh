#!/bin/bash

echo "🚀 Iniciando Deploy FisioFlow (Firebase)..."

# 1. Cloud SQL Migration
echo "🐘 Verifique se o script scripts/db/init_cloud_sql.sql foi executado na sua instância Cloud SQL."

# 2. Configurar Secrets (Se necessário)
# firebase functions:secrets:set CLOUD_SQL_CONNECTION_STRING

# 3. Deploy Cloud Functions
echo "📦 Fazendo deploy das Cloud Functions..."
firebase deploy --only functions

# 4. Deploy Data Connect
echo "🔗 Fazendo deploy do Data Connect..."
firebase deploy --only dataconnect

# 5. Deploy Hosting (Web)
echo "🌐 Fazendo deploy do Hosting..."
npm run build
firebase deploy --only hosting

echo "✅ Deploy Concluído!"
