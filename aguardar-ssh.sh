#!/bin/bash
# Script para aguardar instalação do macOS e conectar via SSH

echo "=========================================="
echo "   Aguardando instalação do macOS..."
echo "   Tempo estimado: 15-30 minutos"
echo "=========================================="
echo ""

for i in {1..60}; do
  clear
  echo "=== Verificação $i/60 ==="
  date
  echo ""

  # Status do container
  echo "Status do Container:"
  docker ps | grep fisioflow-macos || echo "Container PAROU!"
  echo ""

  # Uso de recursos
  echo "Uso de Recursos QEMU:"
  docker exec fisioflow-macos ps aux | grep qemu | awk '{print "CPU: " $3 "% | MEM: " $4 "%"}'
  echo ""

  # Tentar SSH
  echo "Tentando SSH..."
  if timeout 5 ssh -p 10022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null localhost "echo 'SSH OK'; uname -a" 2>/dev/null; then
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║                                                ║"
    echo "║   ✓ SSH DISPONÍVEL! MACOS INSTALADO! ✓        ║"
    echo "║                                                ║"
    echo "╚════════════════════════════════════════════════╝"
    echo ""
    echo "Para conectar ao macOS:"
    echo "  ssh -p 10022 user@localhost"
    echo ""
    echo "Precisa descobrir o usuário? Execute:"
    echo "  ssh -p 10022 root@localhost 'whoami'"
    echo ""
    break
  fi

  echo "✗ SSH não disponível ainda"
  echo "Aguardando 30 segundos... (Ctrl+C para cancelar)"
  sleep 30
done

echo "Script finalizado!"
