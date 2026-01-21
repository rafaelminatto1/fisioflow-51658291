# Alternativas para rodar macOS SEM VNC

## Problema Atual
O VNC conecta mas o servidor fecha antes de enviar a imagem (bug de compatibilidade QEMU/VNC).

## Solução 1: Imagem macOS Pré-Instalada RECOMENDADA

Usar uma imagem que já tem macOS instalado e SSH configurado:

```bash
# Parar container atual
docker stop fisioflow-macos
docker rm fisioflow-macos

# Criar novo container com imagem pré-instalada
docker run -d \
  --name fisioflow-macos \
  --device /dev/kvm \
  --cap-add NET_ADMIN --cap-add SYS_ADMIN \
  -p 10022:10022 \
  -v macos-storage:/home/arch/OSX-KVM \
  -e "RAM_SIZE=4g" \
  -e "CPU_CORES=4" \
  -e "NOPICKER=true" \
  sickcodes/docker-osx:latest

# Aguardar boot e tentar SSH
sleep 60
ssh -p 10022 user@localhost
```

## Solução 2: Instalação Automatizada (Headless)

Modificar script para instalação sem interface gráfica:

```bash
# Criar script de auto-instalação
cat > autoinstall.sh << 'SCRIPT'
#!/bin/bash
# Este script automatiza a instalação do macOS
# Execute via docker exec
SCRIPT

chmod +x autoinstall.sh
```

## Solução 3: Usar SPICE ao invés de VNC

SPICE tem melhor performance e compatibilidade:

```bash
# Modificar Launch.sh para usar SPICE
docker run -d \
  --name fisioflow-macos-spice \
  --device /dev/kvm \
  -p 10022:10022 \
  -v macos-storage:/data \
  -e "RAM_SIZE=4g" \
  -e "SPICE_PORT=5900" \
  sickcodes/docker-osx:latest
```

## Solução 4: Usar variável CUDA_SPICE

O projeto docker-osx suporta CUDA/SPICE:

```bash
docker run -d \
  --name fisioflow-macos \
  --device /dev/kvm \
  -e "CUDA_SPICE=1" \
  -p 5900:5900 \
  -p 10022:10022 \
  sickcodes/docker-osx:latest
```

## Solução 5: Aguardar e tentar SSH posteriormente

O macOS pode estar instalando em background. Aguarde 10-20 minutos e tente:

```bash
# Monitorar progresso
watch docker logs fisioflow-macos

# Tentar SSH periodicamente
while true; do
  if ssh -p 10022 localhost echo "OK" 2>/dev/null; then
    echo "SSH disponível!"
    break
  fi
  echo "Aguardando SSH..."
  sleep 30
done
```

## Recomendação

**Use CUDA_SPICE ou SPICE** que é mais estável que VNC para este caso.
