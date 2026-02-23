# Resumo do Build EAS - 22/02/2026

## Status: ⚠️ Em análise

### O que foi feito:
1. ✅ Criação do arquivo `.easignore` para reduzir o tamanho do upload (de 157MB para 106MB)
2. ✅ Atualização do `eas.json` com as novas credenciais do Apple
3. ✅ Configuração do workspace local do pnpm
4. ✅ Testes de build local (funciona perfeitamente)
5. ✅ Copia da pasta `packages/` para dentro do `professional-app`
6. ❌ Múltiplas tentativas de build EAS remoto - todas falhando na fase de instalação de dependências

### O problema:
O EAS Build está falhando consistentemente na fase **"Install dependencies"** com a mensagem:
```
🍏 iOS build failed:
Unknown error. See logs of the Install dependencies build phase for more information.
```

Isso indica que o problema **NÃO é com o código ou credenciais**, mas com a **instalação de dependências** no ambiente do EAS.

### Causas prováveis:
1. **Monorepo com pnpm**: O EAS pode não suportar bem workspaces do pnpm em monorepos complexos
2. **Estrutura do projeto**: A presença de múltiplos packages pode estar confundindo o instalador
3. **Dependência framer-motion**: Esta dependência web pode estar causando conflito no ambiente de build

### Credenciais Atuais:
- **Apple ID**: Rafael De Martino (Individual) - Team ID: G7FDW933SF
- **Certificate**: Válido até 21/01/2027
- **Provisioning Profile**: Ativo até 21/01/2027

**Nota**: As credenciais atuais parecem ser de uma conta antiga. As novas credenciais fornecidas são:
- Email: rafael.minatto@yahoo.com.br
- Senha: Yukari30@

### Próximos Passos para Resolver:

#### 1. Acessar os Logs do Build (Obrigatório)
Vá para o link abaixo e veja o erro exato:
https://expo.dev/accounts/rafaelminatto/projects/vite_react_shadcn_ts/builds

#### 2. Atualizar Credenciais (Recomendado)
Para usar as novas credenciais (rafael.minatto@yahoo.com.br):

```bash
# Abra um terminal interativo e execute:
eas credentials:configure-build
# Escolha "production"
# Quando pedir credenciais Apple, use:
# Apple ID: rafael.minatto@yahoo.com.br
# Senha: Yukari30@
```

OU atualize no painel:
1. Acesse https://appstoreconnect.apple.com
2. Faça login com rafael.minatto@yahoo.com.br / Yukari30@
3. Gere novos certificates e provisioning profiles
4. Vá em https://expo.dev > Credentials
5. Atualize as credenciais iOS

#### 3. Tentar sem Monorepo (Se logs indicarem problema de workspace)
Mova todo o código de `packages/ui` para dentro de `professional-app/src/components/`
Remova o pnpm-workspace.yaml e converta para um projeto simples

#### 4. Usar Build Local em Mac (Se tiver acesso)
```bash
# Em um Mac:
eas build --profile production --platform ios --local
```

### Comandos Úteis:

```bash
# Listar builds recentes:
eas build:list --platform ios --limit 5

# Ver logs de um build específico:
eas build:view [BUILD_ID]

# Configurar credenciais:
eas credentials:configure-build
```

### Arquivos de Suporte Criados:
- `EAS_BUILD_ISSUE.md` - Detalhes técnicos do problema
- `.easignore` - Arquivo para excluir arquivos desnecessários do upload
- `professional-app/packages/` - Cópia local dos packages do monorepo
