# Informações do Projeto Vercel para GitHub Actions

Estas são as informações necessárias para configurar os secrets no GitHub, obtidas do arquivo `.vercel/project.json`.

## Secrets do GitHub Actions

Você precisa configurar os seguintes secrets no repositório GitHub:

### 1. VERCEL_ORG_ID
```
team_RWPxV6A0gp02a6FO7Ghf2YSV
```

**Como configurar:**
1. Vá para o repositório no GitHub
2. Clique em `Settings` > `Secrets and variables` > `Actions`
3. Clique em `New repository secret`
4. **Name:** `VERCEL_ORG_ID`
5. **Secret:** `team_RWPxV6A0gp02a6FO7Ghf2YSV`
6. Clique em `Add secret`

### 2. VERCEL_PROJECT_ID
```
prj_BKvbZ8XObYhUE9oTFSrqX16WmH3b
```

**Como configurar:**
1. Ainda na página de Secrets do GitHub
2. Clique em `New repository secret`
3. **Name:** `VERCEL_PROJECT_ID`
4. **Secret:** `prj_BKvbZ8XObYhUE9oTFSrqX16WmH3b`
5. Clique em `Add secret`

### 3. VERCEL_TOKEN

Para obter o token, execute o seguinte comando no seu terminal:

```bash
vercel tokens create --name "GitHub Actions CI"
```

Ou acesse manualmente: https://vercel.com/account/tokens

**Como configurar:**
1. Após criar o token na Vercel
2. Vá para a página de Secrets do GitHub
3. Clique em `New repository secret`
4. **Name:** `VERCEL_TOKEN`
5. **Secret:** cole o token obtido
6. Clique em `Add secret`

## Informações do Projeto

- **Nome do Projeto:** fisioflow-lovable
- **Framework:** Vite
- **Diretório de Output:** dist
- **Comando de Build:** npm run build
- **Comando de Install:** npm install
- **Node Version:** 24.x

## Deploy Atual

- **Preview:** https://fisioflow-lovable-9nyfedz4z-rafael-minattos-projects.vercel.app
- **Produção:** https://moocafisio.com.br
- **Inspeção:** https://vercel.com/rafael-minattos-projects/fisioflow-lovable/Cn28s1zMKBifEs6GsBG66zEuUNv6

## Scripts Úteis

```bash
# Listar tokens existentes
vercel tokens list

# Criar novo token
vercel tokens create --name "GitHub Actions CI"

# Remover um token
vercel tokens rm <token-id>

# Ver informações do projeto
vercel inspect

# Deploy para produção
vercel --prod
```

## Observações Importantes

1. **Comandos pnpm:** O projeto usa pnpm, mas as configurações do Vercel mostram `npm install`. Você pode atualizar isso se necessário:
   - Acesse https://vercel.com/rafael-minattos-projects/fisioflow-lovable/settings/build
   - Mude o **Install Command** para: `pnpm install --frozen-lockfile`
   - Mude o **Build Command** para: `pnpm run build`

2. **Token de Escopo:** Quando criar o token, verifique se ele tem escopo adequado:
   - Para CI/CD, geralmente precisamos de escopo completo
   - Selecione "Full Account" ou scope para o time/organização específica

3. **Segurança:** Mantenha os tokens seguros. Se você precisar revogar um token:
   ```bash
   vercel tokens list
   vercel tokens rm <token-id>
   ```

## Checklist de Configuração

- [ ] Configurar `VERCEL_ORG_ID` no GitHub
- [ ] Configurar `VERCEL_PROJECT_ID` no GitHub
- [ ] Criar token na Vercel
- [ ] Configurar `VERCEL_TOKEN` no GitHub
- [ ] (Opcional) Atualizar comandos pnpm no painel da Vercel
- [ ] Fazer push e testar os workflows CI/CD

## Testando a Configuração

Após configurar todos os secrets:

1. Crie uma branch de teste:
```bash
git checkout -b test-vercel-integration
```

2. Faça uma pequena alteração:
```bash
git touch test-ci.txt
git add test-ci.txt
git commit -m "Test Vercel integration"
```

3. Push e abra um PR:
```bash
git push origin test-vercel-integration
```

4. Verifique a aba **Actions** no GitHub para ver se os workflows estão rodando corretamente
