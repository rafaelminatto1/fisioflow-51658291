#!/bin/bash
# Script para iniciar o container macOS

echo "Iniciando fisioflow-macos..."
docker start fisioflow-macos 2>/dev/null || docker run -d \
  --name fisioflow-macos \
  --device /dev/kvm \
  --cap-add NET_ADMIN --cap-add SYS_ADMIN \
  --network bridge \
  -p 8008:8008 -p 5900:5900 \
  -e GENERATE_UNIQUE=true \
  -e AUDIO_DRIVER=none \
  sickcodes/docker-osx:latest

echo "Container iniciado!"
echo "Use ./macos-status.sh para verificar o progresso"
