#!/bin/bash
# Script para monitorar o status do macOS container

echo "=== Status do Container macOS ==="
docker ps --filter "name=fisioflow-macos" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Verificação do VNC ==="
if ss -tlnp 2>/dev/null | grep -q ":5900.*LISTEN" || netstat -tlnp 2>/dev/null | grep -q ":5900"; then
    echo "✓ VNC está rodando na porta 5900"
else
    echo "✗ VNC não está acessível"
fi

echo ""
echo "=== Logs Recentes ==="
docker logs fisioflow-macos 2>&1 | grep -E "(QEMU|Booting|monitor)" | tail -3

echo ""
echo "=== Como Acessar ==="
echo "VNC Port: 5900"
echo ""
echo "Instale um cliente VNC se não tiver:"
echo "  sudo apt install tigervnc-viewer remmina -y"
echo ""
echo "Conectar com:"
echo "  vncviewer localhost:5900"
echo ""
echo "Ou use clientes gráficos:"
echo "  - Remmina (Protocol: VNC, Server: localhost:5900)"
echo "  - Vinagre"
echo "  - TigerVNC"
echo ""
echo "SSH Port: 10022 (quando macOS estiver instalado)"
echo "  ssh -p 10022 user@localhost"
