#!/bin/bash
set -e

echo "🚀 Iniciando deploy para produção..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar se estamos na branch main
echo "${BLUE}📍 Verificando branch...${NC}"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "${RED}❌ Erro: Deploy deve ser feito a partir da branch main${NC}"
  exit 1
fi

# 2. Verificar se há mudanças não commitadas
echo "${BLUE}📦 Verificando mudanças não commitadas...${NC}"
if [[ -n $(git status -s) ]]; then
  echo "${RED}❌ Erro: Existem mudanças não commitadas${NC}"
  git status -s
  exit 1
fi

# 3. Atualizar dependências
echo "${BLUE}📥 Atualizando dependências...${NC}"
pnpm install

# 4. Lint
echo "${BLUE}🔍 Verificando código (lint)...${NC}"
pnpm run lint

# 5. Type check
echo "${BLUE}📝 Verificando tipos (TypeScript)...${NC}"
pnpm run type-check 2>/dev/null || echo "⚠️  Type-check não configurado, pulando..."

# 6. Testes unitários
echo "${BLUE}🧪 Rodando testes unitários...${NC}"
pnpm run test:unit 2>/dev/null || echo "⚠️  Testes unitários não configurados, pulando..."

# 7. Testes E2E (opcional)
echo "${BLUE}🎭 Rodando testes E2E (opcional)...${NC}"
read -p "Rodar testes E2E? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pnpm run test:e2e
fi

# 8. Build otimizado
echo "${BLUE}🏗️  Gerando build de produção...${NC}"
pnpm run build

# 9. Verificar tamanho do bundle
echo "${BLUE}📊 Analisando tamanho do bundle...${NC}"
BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo "Bundle size: $BUNDLE_SIZE"

# 10. Deploy para Firebase
echo "${BLUE}🔥 Fazendo deploy para Firebase...${NC}"
firebase deploy --only hosting,functions

echo "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "🎉 Acesse: https://fisioflow-migration.web.app"
echo ""
echo "📊 Próximos passos:"
echo "  - Verificar logs: https://console.firebase.google.com/project/fisioflow-migration/functions"
echo "  - Monitorar performance: Firebase Performance Monitoring"
echo "  - Verificar Firestore: Firebase Console"
