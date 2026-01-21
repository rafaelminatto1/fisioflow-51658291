#!/bin/bash
# Alternativas para acessar macOS SEM VNC

echo "=== Alternativas SEM VNC para macOS ==="
echo ""
echo "1. SSH (após instalação do macOS):"
echo "   ssh -p 10022 user@localhost"
echo ""
echo "2. Screencast para arquivo (visualizar boot):"
echo "   docker exec fisioflow-macos qemu-system-x86_64 -screenshot /tmp/screen.png"
echo ""
echo "3. Monitor via QMP (QEMU Monitor Protocol):"
echo "   echo 'info status' | docker exec -i fisioflow-macos nc localhost 4444"
echo ""
echo "4. Ver logs do boot:"
echo "   docker logs fisioflow-macos -f"
echo ""
echo "=== Testando agora ==="
echo ""

# Verificar se SSH está respondendo (após instalação)
if timeout 3 bash -c "echo '' | nc -w 1 localhost 10022" 2>/dev/null; then
    echo "✓ SSH está ATIVO na porta 10022!"
    echo "  Comando: ssh -p 10022 user@localhost"
else
    echo "✗ SSH ainda não disponível (macOS precisa ser instalado primeiro)"
fi

# Verificar status do container
echo ""
echo "=== Status do Container ==="
docker ps | grep fisioflow-macos || echo "Container não está rodando"

# Verificar CPU do QEMU (se está processando)
echo ""
echo "=== Uso de CPU do QEMU ==="
docker exec fisioflow-macos ps aux | grep qemu | awk '{print "CPU: " $3 "% | RAM: " $4 "%"}'

echo ""
echo "=== Para acessar SEM VNC, precisamos esperar ==="
echo "que o macOS termine de instalar (via VNC ou imagem pré-instalada)"
