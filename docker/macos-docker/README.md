# 🍎 macOS Docker - FisioFlow iOS Development

Ambiente macOS com Xcode via Docker para desenvolvimento do app iOS FisioFlow no Linux.

## ⚠️ Aviso Legal

**Use este ambiente APENAS para:**
- Desenvolvimento e testes
- Aprender macOS/iOS development
- Debugar código iOS

**NÃO use para:**
- Produção
- Submeter apps para App Store
- Distribuição comercial

Isso pode violar os termos de serviço da Apple. Para produção, use hardware Apple ou serviços autorizados (MacStadium, AWS Mac, etc).

---

## 📋 Pré-requisitos

### Linux (Ubuntu/Debian)
```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
# Faça logout e login novamente

# Habilitar KVM (aceleração de hardware)
sudo modprobe kvm
sudo usermod -aG kvm $USER

# Verificar KVM
ls /dev/kvm
```

### Recursos Mínimos
| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| RAM | 8 GB | 16 GB+ |
| CPU | 4 cores | 8 cores+ |
| Disco | 50 GB livres | 100 GB+ |
| GPU | - | Intel/AMD (para KVM) |

---

## 🚀 Início Rápido

### 1. Copiar configuração
```bash
cd docker/macos-docker
cp .env.example .env
```

### 2. Editar recursos (opcional)
```bash
nano .env

# Ajuste conforme seu sistema:
# RAM_SIZE=16g      # Para 16GB de RAM
# CPU_CORES=8       # Para 8 cores
```

### 3. Iniciar macOS
```bash
chmod +x start-macos.sh
./start-macos.sh
# Selecione opção 1 (modo rápido)
```

### 4. Acessar macOS
**Via navegador:**
```
http://localhost:8888
```

**Via cliente VNC:**
```
Endereço: localhost:5900
Senha: fisioflow123
```

---

## 📱 Primeiro Setup

### No macOS (via VNC):

1. **Completar setup inicial**
   - Selecione idioma, país, etc.
   - Crie uma conta local (use `root` / `fisioflow123`)
   - Pule o iCloud e outros serviços Apple

2. **Instalar ferramentas de desenvolvimento**

No Terminal do macOS:
```bash
# Instalar Homebrew (se não tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Node.js 20
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Instalar CocoaPods (necessário para iOS)
sudo gem install cocoapods

# Instalar pnpm
npm install -g pnpm@9
```

3. **Configurar projeto FisioFlow**

```bash
# O projeto já está montado em /root/fisioflow
cd /root/fisioflow

# Instalar dependências
pnpm install

# Build do web app
pnpm build

# Adicionar plataforma iOS
npx cap add ios

# Sincronizar Capacitor
npx cap sync ios
```

4. **Abrir projeto no Xcode**

```bash
npx cap open ios
# OU
open ios/App/App.xcworkspace
```

---

## 🛠️ Comandos Úteis

### Via Script
```bash
./start-macos.sh
# Menu interativo com todas as opções
```

### Via Docker Compose
```bash
# Iniciar
docker compose up -d

# Parar
docker compose down

# Ver logs
docker compose logs -f

# Ver status
docker compose ps

# Entrar no container (SSH)
docker exec -it fisioflow-macos bash

# Reconstruir
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 📱 Desenvolvendo App iOS

### Workflow Recomendado

1. **Desenvolver no Linux (web/Android)**
   ```bash
   # No seu Linux host
   cd /path/to/fisioflow
   pnpm dev  # Desenvolver normalmente
   ```

2. **Testar no macOS Docker**
   ```bash
   # No macOS (via VNC)
   cd /root/fisioflow
   pnpm build
   npx cap sync ios
   npx cap run ios  # Rodar no simulador
   ```

3. **Build para produção**
   ```bash
   # No Xcode (via VNC)
   # Product > Archive
   ```

### Hot Reload

```bash
# No Linux host - desenvolver
pnpm dev

# No macOS Docker - sincronizar mudanças
cd /root/fisioflow
pnpm build
npx cap sync ios
# O app no simulador/Xcode recarrega automaticamente
```

---

## 🐛 Troubleshooting

### Container não inicia
```bash
# Ver logs
docker compose logs -f

# Ver se KVM está habilitado
ls /dev/kvm

# Verificar permissões
groups | grep docker
groups | grep kvm
```

### Tela preta no VNC
- **Normal**: Pode levar 1-2 minutos para inicializar
- **Se persistir**: Reinicie o container
  ```bash
  docker compose restart
  ```

### Performance lenta
```bash
# Editar .env e aumentar recursos
RAM_SIZE=16g
CPU_CORES=8

# Reiniciar
docker compose down
docker compose up -d
```

### Xcode não abre
```bash
# Verificar se build foi feito
cd /root/fisioflow
pnpm build
npx cap sync ios

# Tentar abrir manualmente
open ios/App/App.xcworkspace
```

### Erro de permissões
```bash
# Corrigir permissões do projeto
sudo chown -R $USER:$USER /path/to/fisioflow
```

---

## 🔧 Configurações Avançadas

### Aumentar resolução de tela
Edite `docker-compose.yml`:
```yaml
environment:
  - RESOLUTION=1920x1080
```

### Habilitar som
```yaml
ports:
  - "8888:8888"
  - "5900:5900"
  - "4713:4713"  # PulseAudio
```

### Persistir dados do Xcode
Os volumes já estão configurados para persistir:
- Configurações Xcode: `xcode-config`
- Cache CocoaPods: `cocoapods-cache`
- Disco macOS: `macos-storage`

---

## 📊 Performance Tips

1. **Use SSD** para o volume do macOS
2. **Aloque mais RAM** se possível (16g+)
3. **Use CPU com suporte a virtualização** (Intel VT-x / AMD-V)
4. **Feche apps desnecessários** no host
5. **Use modo performance** no script (opção 2)

---

## 🌐 Alternativas Recomendadas

Para **produção** ou builds oficiais App Store:

| Serviço | Custo | Para Quem |
|---------|-------|-----------|
| [MacStadium](https://www.macstadium.com/) | ~$0.50-1.00/hora | Desenvolvimento intensivo |
| [AWS EC2 Mac](https://aws.amazon.com/ec2/instance-types/mac/) | ~$0.65-1.08/hora | Já usa AWS |
| [Bitrise](https://www.bitrise.io/) | Grátis-$299/mês | CI/CD |
| [GitHub Actions](https://github.com/features/actions) | Grátis (2000min/mês) | Builds automatizados |

---

## 📚 Referências

- [Docker-OSX GitHub](https://github.com/sickcodes/Docker-OSX)
- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Apple Developer](https://developer.apple.com/)

---

## 🤝 Suporte

Problemas?
1. Veja o [Troubleshooting](#-troubleshooting) acima
2. Check [Docker-OSX Issues](https://github.com/sickcodes/Docker-OSX/issues)
3. Comente no projeto FisioFlow

---

**Última atualização:** Janeiro 2026
