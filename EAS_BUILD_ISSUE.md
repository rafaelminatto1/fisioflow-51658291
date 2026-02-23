# EAS Build Issue - 22/02/2026

## Problema
O build EAS para iOS está falhando consistentemente na fase "Install dependencies" com a mensagem:
```
🍏 iOS build failed:
Unknown error. See logs of the Install dependencies build phase for more information.
```

## Status das Tentativas
- **Build local**: ✅ Funciona (npx expo export --platform ios)
- **Build EAS Remote**: ❌ Falha na fase de instalação de dependências

## Configuração Atual

### Arquivos Modificados
- `.easignore` - Criado para reduzir o tamanho do upload
- `professional-app/eas.json` - Configuração de build EAS
- `professional-app/pnpm-workspace.yaml` - Workspace local do pnpm
- `professional-app/packages/` - Copiado da raiz para dentro do app

### Credenciais
O EAS está usando as credenciais existentes:
- **Apple Team**: G7FDW933SF (Rafael De Martino (Individual))
- **Distribution Certificate**: 4B7FD1CB3A79D540975FE474544FD7CC
- **Provisioning Profile**: MKT289DRG7 (ativo até 21/01/2027)

### Novas Credenciais do Usuário
- **Email**: rafael.minatto@yahoo.com.br
- **Senha**: Yukari30@
- **Apple Team ID**: G7FDW933SF (parece ser o mesmo)

## Possíveis Causas

1. **Monorepo com pnpm**: O EAS pode não estar conseguindo lidar com a estrutura de monorepo
2. **Workspace do pnpm**: A configuração do workspace pode estar confusa
3. **Dependências do packages/ui**: A dependência `framer-motion` pode estar causando problemas
4. **Versão do Node**: O EAS pode estar usando uma versão incompatível

## Soluções Tentadas

1. ✅ Criar `.easignore` para reduzir o tamanho do upload
2. ✅ Copiar pasta `packages/` para dentro do `professional-app`
3. ✅ Criar `pnpm-workspace.yaml` local
4. ✅ Remover o `pnpm-lock.yaml` para forçar o uso de npm
5. ✅ Adicionar scripts de pre-install e eas-build-pre-install
6. ❌ Todas as tentativas falharam

## Próximos Passos Recomendados

### Opção 1: Acessar os Logs Detalhados
Acesse o link do build para ver o erro exato:
https://expo.dev/accounts/rafaelminatto/projects/vite_react_shadcn_ts/builds/fb0d1899-7556-4b97-afb4-fc6bc186d5ec

### Opção 2: Converter para Yarn
Gerar um `yarn.lock` válido para o projeto e usar yarn como gerenciador de pacotes.

### Opção 3: Remover o Monorepo Temporariamente
Mover todo o código do `packages/ui` e `packages/shared-api` para dentro do `professional-app/src/` temporariamente.

### Opção 4: Usar build local em macOS
Fazer o build em um Mac usando Xcode ou usando o EAS local.

### Opção 5: Atualizar Credenciais no Painel do EAS
1. Acesse https://expo.dev
2. Vá para o projeto `@rafaelminatto/vite_react_shadcn_ts`
3. Seção Credentials
4. Verifique se as credenciais iOS estão atualizadas

## Links Úteis
- Documentação do EAS Build: https://docs.expo.dev/build/introduction
- EAS CLI: https://docs.expo.dev/eas
- Painel do EAS: https://expo.dev/accounts/rafaelminatto/projects/vite_react_shadcn_ts
