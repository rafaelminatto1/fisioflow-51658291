# Solução Final para macOS via Docker SEM VNC

## Problema Identificado

Seu sistema tem problemas de dependência (snap/GLIBC) que afetam:
- TigerVNC viewer
- Remmina  
- Virt-viewer

## SOLUÇÃO: Usar Cliente VNC em Container Docker

### Passo 1: Instalar cliente VNC em container

```bash
docker run -d \
  --name vnc-client \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  dorowu/vncviewer:latest

# Conectar ao macOS
docker exec vnc-client vncviewer fisioflow-macos:5900
```

### Passo 2: OU aguardar instalação e usar SSH

O macOS está instalando em background. Aguarde 15-20 minutos:

```bash
# Monitorar o progresso
watch -n 10 'docker logs fisioflow-macos | tail -20'

# Tentar SSH a cada 2 minutos
while true; do
  echo "Tentando SSH..."
  timeout 5 ssh -p 10022 -o StrictHostKeyChecking=no localhost "echo 'SSH OK!' && exit"
  if [ $? -eq 0 ]; then
    echo "✓ SSH FUNCIONANDO!"
    echo "Use: ssh -p 10022 user@localhost"
    break
  fi
  echo "Aguardando... (30s)"
  sleep 30
done
```

### Passo 3: Verificar se macOS está instalando

```bash
# Ver CPU do QEMU (alto = instalando)
docker exec fisioflow-macos top -bn1 | grep qemu

# Ver tamanho do disco (crescendo = instalando)
docker exec fisioflow-macos ls -lh /home/arch/OSX-KVM/mac_hdd_ng.img
```

## Script Completo de Espera e Teste

```bash
#!/bin/bash
echo "Aguardando instalação do macOS..."
echo "Isso pode levar 15-30 minutos"

for i in {1..60}; do
  clear
  echo "=== Verificação $i/60 ==="
  date
  echo ""
  
  # Status do container
  docker ps | grep fisioflow-macos
  echo ""
  
  # Uso de recursos
  docker exec fisioflow-macos ps aux | grep qemu | awk '{print "CPU: " $3 "% | MEM: " $4 "%"}'
  echo ""
  
  # Tentar SSH
  if timeout 5 ssh -p 10022 -o StrictHostKeyChecking=no localhost "echo 'SSH OK'; uname -a" 2>/dev/null; then
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   ✓ SSH DISPONÍVEL! MACOS INSTALADO!   ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    echo "Conecte com:"
    echo "  ssh -p 10022 user@localhost"
    echo ""
    break
  fi
  
  echo "SSH não disponível ainda... aguardando 30s"
  sleep 30
done
```

## Alternativa: Instalar Cliente VNC Correto

```bash
# Remover versões problemáticas do snap
sudo snap remov

# Instalar via apt (não snap)
sudo apt install -y tigervnc-viewer

# Conectar
vncviewer localhost:5900
```

## Informações Atuais

- **Container:** fisioflow-macos (rodando com CUDA_SPICE)
- **Porta SPICE:** 5900 (ativa)
- **Porta SSH:** 10022 (ativa)
- **CPU QEMU:** 107% (ativo - instalando)
- **Tempo estimado:** 15-30 min para instalação completa

## Próximos Passos

**Opção A:** Aguardar e usar SSH
**Opção B:** Resolver dependências do sistema
**Opção C:** Usar máquina diferente para desenvolvimento iOS
