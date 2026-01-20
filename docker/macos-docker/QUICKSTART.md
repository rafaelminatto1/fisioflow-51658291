# ⚡ Quick Start - macOS Docker

## 3 passos para iniciar:

```bash
# 1. Navegar para o diretório
cd docker/macos-docker

# 2. Copiar configuração
cp .env.example .env

# 3. Iniciar
./start-macos.sh
```

## Primeiro acesso:

1. **Aguardar 2-5 minutos** (tela preta é normal)
2. **Acessar via navegador**: http://localhost:8888
3. **Senha VNC**: `fisioflow123`
4. **Completar setup do macOS**
5. **No Terminal do macOS**:
   ```bash
   brew install node@20 cocoapods
   cd /root/fisioflow
   pnpm install && pnpm build
   npx cap add ios
   npx cap sync ios
   npx cap open ios
   ```

## Acesso rápido:

| Método | URL | Senha |
|--------|-----|-------|
| Navegador | http://localhost:8888 | fisioflow123 |
| VNC Nativo | localhost:5900 | fisioflow123 |

## Troubleshooting rápido:

```bash
# Ver logs
./start-macos.sh  # Opção 6

# Reiniciar
./start-macos.sh  # Opção 4 → 1

# Performance ruim? Editar .env:
RAM_SIZE=16g
CPU_CORES=8
```

---

**Documentação completa**: [README.md](./README.md)
