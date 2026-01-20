# macOS via Docker - Status de Configuração

## ✓ Configuração Completa

**Container:** fisioflow-macos
**Status:** Rodando há ~10 minutos
**VNC Porta:** 5900 (ABERTA e respondendo)
**SSH Porta:** 10022

## Configuração Técnica

- **Imagem:** macOS Sequoia (15)
- **RAM:** 4GB
- **CPUs:** 4 cores com KVM acceleration
- **Disco:** 256GB (persiste no volume macos-storage)
- **VNC:** Configurado e funcionando (-vnc :0)
- **Áudio:** Desabilitado

## Como Acessar o macOS

### Passo 1: Instalar o Cliente VNC

Abra um terminal e execute:

```bash
sudo apt install -y tigervnc-viewer
```

### Passo 2: Conectar ao VNC

```bash
vncviewer localhost:5900
```

Ou use o Remmina (mas pode ter problemas de dependência):
- Abra Remmina
- Protocolo: VNC
- Server: localhost:5900

## Scripts de Gestão

### Monitorar Status
```bash
./macos-monitor.sh
```

### Ver Logs
```bash
docker logs fisioflow-macos -f
```

### Parar/Iniciar
```bash
# Parar
docker stop fisioflow-macos

# Iniciar (dados preservados)
docker start fisioflow-macos

# Reiniciar
docker restart fisioflow-macos
```

## O Que Esperar Ao Conectar

Quando conectar via VNC, você verá:
1. **Boot do OpenCore** (menu de boot)
2. **Instalador macOS Sequoia** - selecione o disco e instale
3. **Configuração inicial** - país, idioma, usuário Apple ID
4. **Desktop macOS** - pronto para usar!

## Após Instalação do macOS

1. Abra a **App Store**
2. Instale o **Xcode**
3. Configure sua Apple Developer Account
4. Desenvolva seu app iOS/macOS

## Notas Importantes

- **Performance:** Será menor que hardware Mac real
- **Uso:** Recomendado apenas para desenvolvimento/teste
- **Legal:** Configuração não oficial da Apple

## Problemas Comuns

### "gtk initialization failed" - RESOLVIDO ✓
Modificamos o script Launch.sh para usar VNC nativo.

### "Connection refused"
Verifique se o container está rodando:
```bash
docker ps | grep fisioflow-macos
```

### "Cannot connect to VNC server"
Aguardar o boot completo do macOS (pode levar 2-3 minutos)

---

**Pronto para acessar! Execute:**
```bash
sudo apt install -y tigervnc-viewer && vncviewer localhost:5900
```
