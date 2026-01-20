#!/bin/bash
# ========================================
# Script de Inicialização - macOS Docker
# FisioFlow iOS Development
# ========================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗                 ║
║   ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝                 ║
║   ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗                 ║
║   ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║                 ║
║   ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║                 ║
║   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝                 ║
║                                                               ║
║                  🍎 macOS + Xcode via Docker                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verificar pré-requisitos
echo -e "${YELLOW}🔍 Verificando pré-requisitos...${NC}"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado. Instale primeiro:${NC}"
    echo "   curl -fsSL https://get.docker.com | sh"
    exit 1
fi
echo -e "${GREEN}✅ Docker encontrado${NC}"

# Verificar Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose não encontrado. Tentando usar docker-compose...${NC}"
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose não encontrado${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Docker Compose encontrado${NC}"

# Verificar KVM (Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if ! ls /dev/kvm &> /dev/null; then
        echo -e "${RED}❌ KVM não encontrado. Execute:${NC}"
        echo "   sudo modprobe kvm"
        echo "   sudo usermod -aG kvm \$USER"
        echo "   # Faça logout e login novamente"
        exit 1
    fi
    echo -e "${GREEN}✅ KVM habilitado${NC}"
fi

# Verificar se usuário está no grupo docker
if ! groups | grep -q docker; then
    echo -e "${YELLOW}⚠️  Você não está no grupo docker. Execute:${NC}"
    echo "   sudo usermod -aG docker \$USER"
    echo "   # Faça logout e login novamente"
    echo ""
    read -p "Continuar mesmo assim? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Carregar variáveis de ambiente
if [ -f .env ]; then
    echo -e "${GREEN}✅ Carregando configurações do .env${NC}"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Menu de opções
echo ""
echo -e "${BLUE}Selecione a opção:${NC}"
echo "  1) Iniciar macOS (modo rápido)"
echo "  2) Iniciar macOS (modo performance - requer mais RAM)"
echo "  3) Iniciar macOS (configuração personalizada)"
echo "  4) Parar macOS"
echo "  5) Ver status"
echo "  6) Ver logs"
echo "  7) Acessar via VNC (navegador)"
echo "  8) Acessar via VNC (cliente nativo)"
echo "  9) Reconstruir container"
echo "  0) Sair"
echo ""
read -p "Opção: " option

case $option in
    1)
        echo -e "${GREEN}🚀 Iniciando macOS em modo rápido...${NC}"
        RAM_SIZE="8g" CPU_CORES="4" docker compose up -d
        ;;
    2)
        echo -e "${GREEN}🚀 Iniciando macOS em modo performance...${NC}"
        RAM_SIZE="16g" CPU_CORES="8" docker compose up -d
        ;;
    3)
        read -p "RAM (ex: 8g, 16g): " ram
        read -p "CPU cores (ex: 4, 8): " cpu
        echo -e "${GREEN}🚀 Iniciando macOS com $ram RAM e $cpu cores...${NC}"
        RAM_SIZE="$ram" CPU_CORES="$cpu" docker compose up -d
        ;;
    4)
        echo -e "${YELLOW}🛑 Parando macOS...${NC}"
        docker compose down
        exit 0
        ;;
    5)
        echo -e "${BLUE}📊 Status do container:${NC}"
        docker compose ps
        exit 0
        ;;
    6)
        echo -e "${BLUE}📋 Logs (Ctrl+C para sair):${NC}"
        docker compose logs -f
        exit 0
        ;;
    7)
        echo -e "${GREEN}🌐 Abrindo VNC no navegador...${NC}"
        if [ -z "$VNC_PORT" ]; then VNC_PORT="8888"; fi
        xdg-open "http://localhost:$VNC_PORT" 2>/dev/null || open "http://localhost:$VNC_PORT" 2>/dev/null || echo "Abra no navegador: http://localhost:$VNC_PORT"
        exit 0
        ;;
    8)
        echo -e "${GREEN}🖥️  Para conectar via cliente VNC:${NC}"
        if [ -z "$VNC_NATIVE" ]; then VNC_NATIVE="5900"; fi
        echo "   Endereço: localhost:$VNC_NATIVE"
        echo "   Senha: ${VNC_PASSWORD:-fisioflow123}"
        echo ""
        echo "   Clientes recomendados:"
        echo "   - Linux: Remmina, Vinagre, vncviewer"
        echo "   - Windows: RealVNC Viewer, TightVNC"
        echo "   - macOS: Screen Sharing (conectar localhost:$VNC_NATIVE)"
        exit 0
        ;;
    9)
        echo -e "${YELLOW}🔨 Reconstruindo container...${NC}"
        docker compose down
        docker compose build --no-cache
        docker compose up -d
        ;;
    0)
        echo -e "${BLUE}👋 Até logo!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Opção inválida${NC}"
        exit 1
        ;;
esac

# Aguardar container iniciar
echo ""
echo -e "${YELLOW}⏳ Aguardando macOS iniciar...${NC}"
echo "   Isso pode levar 2-5 minutos na primeira vez..."
echo ""

# Timeout de 5 minutos
timeout=300
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose ps | grep -q "Up"; then
        echo -e "${GREEN}✅ Container está rodando!${NC}"
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
    echo -n "."
done

echo ""
echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 macOS está pronto!${NC}"
echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 Acesso via Navegador:${NC}"
echo "   URL: http://localhost:${VNC_PORT:-8888}"
echo ""
echo -e "${BLUE}🖥️  Acesso via Cliente VNC:${NC}"
echo "   Endereço: localhost:${VNC_NATIVE:-5900}"
echo "   Senha: ${VNC_PASSWORD:-fisioflow123}"
echo ""
echo -e "${YELLOW}⚠️  Primeira inicialização:${NC}"
echo "   1. A tela pode ficar preta por 1-2 minutos (normal)"
echo "   2. Complete o setup do macOS"
echo "   3. Abra o Terminal e instale as ferramentas:"
echo "      brew install node@20 cocoapods"
echo "   4. Navegue para /root/fisioflow"
echo "   5. Execute: pnpm install && pnpm build"
echo "   6. Abra o Xcode e carregue o projeto iOS"
echo ""
echo -e "${RED}⚠️  AVISO LEGAL:${NC}"
echo "   Use apenas para desenvolvimento/testes"
echo "   Não use para produção ou App Store"
echo "   Respeite os termos da Apple"
echo ""
