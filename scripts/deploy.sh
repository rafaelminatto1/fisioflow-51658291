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
npm ci

# 4. Lint
echo "${BLUE}🔍 Verificando código (lint)...${NC}"
npm run lint

# 5. Type check
echo "${BLUE}📝 Verificando tipos (TypeScript)...${NC}"
npm run type-check

# 6. Testes unitários
echo "${BLUE}🧪 Rodando testes unitários...${NC}"
npm run test:unit

# 7. Testes E2E
echo "${BLUE}🎭 Rodando testes E2E...${NC}"
npm run test:e2e

# 8. Build otimizado
echo "${BLUE}🏗️  Gerando build de produção...${NC}"
npm run build

# 9. Verificar tamanho do bundle
echo "${BLUE}📊 Analisando tamanho do bundle...${NC}"
BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo "Bundle size: $BUNDLE_SIZE"

# 10. Deploy para Vercel
echo "${BLUE}🌐 Fazendo deploy para Vercel...${NC}"
npx vercel --prod

echo "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "🎉 Acesse: https://fisioflow.vercel.app"
echo ""
echo "📊 Próximos passos:"
echo "  - Verificar logs: https://vercel.com/dashboard"
echo "  - Monitorar performance: Vercel Analytics"
echo "  - Verificar Edge Functions: Supabase Dashboard"
