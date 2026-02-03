#!/bin/bash
#
# Script de Deploy para Produção - FisioFlow
# Configuração e deploy de todas as funcionalidades
#

set -e

echo "🚀 FisioFlow - Deploy para Produção"
echo "======================================"
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================================================
# 1. Verificar pré-requisitos
# ============================================================================

echo -e "${BLUE}1️⃣ Verificando pré-requisitos...${NC}"

# Verificar Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI não encontrado${NC}"
    echo "   Instale com: npm install -g firebase-tools"
    exit 1
fi

# Verificar se está logado
if ! firebase login:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Você precisa estar logado no Firebase${NC}"
    echo "   Execute: firebase login"
    read -p "Pressione ENTER após fazer login..."
fi

echo -e "   ${GREEN}✅ Pré-requisitos OK${NC}"
echo ""

# ============================================================================
# 2. Instalar dependências
# ============================================================================

echo -e "${BLUE}2️⃣ Instalando dependências...${NC}"

# Instalar dependências do projeto raiz
echo "   Instalando dependências principais..."
pnpm install --frozen-lockfile

# Instalar dependências das functions
echo "   Instalando dependências das Functions..."
cd functions
pnpm install --frozen-lockfile
cd ..

echo -e "   ${GREEN}✅ Dependências instaladas${NC}"
echo ""

# ============================================================================
# 3. Build do projeto
# ============================================================================

echo -e "${BLUE}3️⃣ Build do projeto...${NC}"

pnpm build

echo -e "   ${GREEN}✅ Build concluído${NC}"
echo ""

# ============================================================================
# 4. Deploy Firestore indexes
# ============================================================================

echo -e "${BLUE}4️⃣ Deploy Firestore indexes...${NC}"

firebase deploy:firestore --only firestore:indexes

echo -e "   ${GREEN}✅ Indexes deployados${NC}"
echo ""

# ============================================================================
# 5. Deploy Cloud Functions
# ============================================================================

echo -e "${BLUE}5️⃣ Deploy Cloud Functions...${NC}"

# Verificar se o projeto existe
PROJECT_ID=$(firebase projects:list 2>/dev/null | grep -oP 'fisioflow-[^\s]+' || echo "")

if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  Nenhum projeto FisioFlow encontrado${NC}"
    echo "   Criando projeto Firebase..."
    firebase projects:create fisioflow-production
    PROJECT_ID="fisioflow-production"
fi

# Definir projeto
firebase use "$PROJECT_ID" 2>/dev/null || firebase use --project "$PROJECT_ID"

# Deploy das functions
echo "   Fazendo deploy das functions..."
firebase deploy --only functions

echo -e "   ${GREEN}✅ Cloud Functions deployadas${NC}"
echo ""

# ============================================================================
# 6. Hosting (opcional)
# ============================================================================

echo -e "${BLUE}6️⃣ Deploy Hosting (opcional)...${NC}"

read -p "Fazer deploy do Hosting? (s/N): " -n -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "   Fazendo deploy do hosting..."
    firebase deploy --only hosting
    echo -e "   ${GREEN}✅ Hosting deployado em: https://fisioflow-prod.web.app${NC}"
    echo ""
fi

# ============================================================================
# 7. Verificar deploy
# ============================================================================

echo -e "${BLUE}7️⃣ Verificando deploy...${NC}"

echo "   Functions disponíveis:"
firebase functions:list

echo ""
echo -e "${GREEN}✨ Deploy concluído com sucesso!${NC}"
echo ""
echo "📋 URLs de produção:"
echo "   - Hosting: https://fisioflow-prod.web.app"
echo "   - Functions: https://us-central1-fisioflow-production.cloudfunctions.net"
echo ""
echo "🔗 Funcionalidades disponíveis:"
echo "   - Time Tracking: /timetracking"
echo "   - Wiki: /wiki"
echo "   - Automation: /automation"
echo "   - Integrações: /integrations"
echo ""
echo "📚 Documentação:"
echo "   - OAuth Setup: docs/OAUTH_SETUP_GUIDE.md"
echo "   - API Keys: docs/API_KEYS_GUIDE.md"
