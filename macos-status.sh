#!/bin/bash
# Script para verificar o status do macOS container

echo "=== Status do Container macOS ==="
docker ps --filter "name=fisioflow-macos" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Últimos Logs (últimas 15 linhas) ==="
docker logs fisioflow-macos --tail 15 2>&1 | tail -15

echo ""
echo "=== Informações de Acesso ==="
echo "VNC (recomendado): vnc://localhost:5900"
echo "VNC Web: http://localhost:8008"
echo ""
echo "Para acessar via VNC:"
echo "  - Linux: Remmina, Vinagre, ou: vncviewer localhost:5900"
echo "  - Use qualquer cliente VNC para conectar na porta 5900"
