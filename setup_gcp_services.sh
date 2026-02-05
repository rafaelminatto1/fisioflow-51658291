#!/bin/bash
# setup_gcp_services.sh
# Script para habilitar as APIs necessárias no projeto Google Cloud do FisioFlow

echo "🚀 Iniciando configuração de serviços GCP para FisioFlow..."

# Verifica se o usuário está logado
gcloud auth list --filter=status:ACTIVE --format="value(account)" > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Erro: Você não está logado no gcloud. Execute 'gcloud auth login' primeiro."
    exit 1
fi

# Pega o Project ID atual
PROJECT_ID=$(gcloud config get-value project)
echo "📂 Projeto Selecionado: $PROJECT_ID"

echo "⏳ Habilitando APIs... (Isso pode levar alguns minutos)"

# 1. Vertex AI (Para o Genkit)
gcloud services enable aiplatform.googleapis.com
echo "✅ Vertex AI API habilitada."

# 2. Cloud Healthcare API (Para DICOM/FHIR)
gcloud services enable healthcare.googleapis.com
echo "✅ Cloud Healthcare API habilitada."

# 3. Cloud Run (Para containers Python)
gcloud services enable run.googleapis.com
echo "✅ Cloud Run API habilitada."

# 4. Artifact Registry (Para armazenar imagens Docker)
gcloud services enable artifactregistry.googleapis.com
echo "✅ Artifact Registry API habilitada."

# 5. Cloud Build (Para construir os containers)
gcloud services enable cloudbuild.googleapis.com
echo "✅ Cloud Build API habilitada."

echo "🎉 Todas as APIs foram solicitadas. Verifique o console para confirmação final."
echo "🔗 Link: https://console.cloud.google.com/apis/dashboard?project=$PROJECT_ID"
