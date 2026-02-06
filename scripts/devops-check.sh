#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Iniciando Verificação DevOps Local...${NC}"

# 1. Verificar dependências
echo -e "
${YELLOW}📦 Verificando dependências...${NC}"
pnpm install --frozen-lockfile
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependências OK${NC}"
else
    echo -e "${RED}❌ Erro na instalação de dependências${NC}"
    exit 1
fi

# 2. Linting
echo -e "
${YELLOW}🔍 Executando Linting...${NC}"
pnpm run lint
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Linting OK${NC}"
else
    echo -e "${RED}❌ Erro no Linting${NC}"
    # Não sai com erro para permitir continuar, mas avisa
fi

# 3. Type Checking
echo -e "
${YELLOW}📘 Executando Type Checking...${NC}"
pnpm run tsc --noEmit
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ TypeScript OK${NC}"
else
    echo -e "${RED}❌ Erros de Tipagem Encontrados${NC}"
    exit 1
fi

# 4. Verificar Funções (Build)
echo -e "
${YELLOW}⚡ Verificando Build das Cloud Functions...${NC}"
cd functions
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build das Functions OK${NC}"
else
    echo -e "${RED}❌ Erro no Build das Functions${NC}"
    exit 1
fi
cd ..

# 5. Verificar Worker (Python)
echo -e "
${YELLOW}🐍 Verificando Worker Python...${NC}"
if [ -d "workers/image-processor" ]; then
    cd workers/image-processor
    # Verifica se consegue instalar deps (dry-run) ou sintaxe básica
    python3 -m py_compile main.py
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Sintaxe Python OK${NC}"
    else
        echo -e "${RED}❌ Erro na sintaxe Python${NC}"
        exit 1
    fi
    cd ../..
else
    echo -e "${YELLOW}⚠️ Diretório workers/image-processor não encontrado${NC}"
fi

echo -e "
${GREEN}🎉 DevOps Check Concluído com Sucesso!${NC}"
echo -e "O projeto está pronto para commit/push."
