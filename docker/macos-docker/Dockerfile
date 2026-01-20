# ========================================
# FisioFlow - macOS Docker com Xcode
# Baseado em: sickcodes/docker-osx
# ========================================

# Usar imagem oficial do Docker-OSX
FROM sickcodes/docker-osx:latest

LABEL maintainer="rafael@fisioflow.com"
LABEL description="macOS com Xcode para desenvolvimento FisioFlow iOS"

# Metadados
ENV VNC_PORT=8888
ENV VNC_PASSWORD=fisioflow123

# Configurações do macOS
ENV OS= ventura
ENV ARCH= x86_64

# Expor portas
EXPOSE 8888 5900

# O Docker-OSX já configura tudo, vamos apenas expor as portas
# A configuração do Xcode será feita dentro do macOS em execução
