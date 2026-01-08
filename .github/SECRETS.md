# Secrets Necessários para GitHub Actions

Este documento lista todos os secrets que precisam ser configurados no repositório GitHub para que os workflows de CI/CD funcionem corretamente.

## Secrets para Deploy com Vercel

Os seguintes secrets são necessários para os workflows de deploy ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

### VERCEL_ORG_ID
**Obrigatório para:** Deploy preview e produção

Este é o ID da sua organização Vercel. Pode ser encontrado no arquivo `.vercel/project.json` localmente após rodar `vercel link`:

```bash
cat .vercel/project.json | grep orgId
```

**Como configurar:**
1. Vá para `Settings` > `Secrets and variables` > `Actions` no seu repositório GitHub
2. Clique em `New repository secret`
3. Nome: `VERCEL_ORG_ID`
4. Valor: O ID da sua organização Vercel

### VERCEL_PROJECT_ID
**Obrigatório para:** Deploy preview e produção

Este é o ID do projeto Vercel. Pode ser encontrado no arquivo `.vercel/project.json` localmente:

```bash
cat .vercel/project.json | grep projectId
```

**Como configurar:**
1. Vá para `Settings` > `Secrets and variables` > `Actions` no seu repositório GitHub
2. Clique em `New repository secret`
3. Nome: `VERCEL_PROJECT_ID`
4. Valor: O ID do seu projeto Vercel

### VERCEL_TOKEN
**Obrigatório para:** Deploy preview e produção

Este é um token de acesso pessoal para autenticar com a API da Vercel.

**Como obter:**
1. Acesse [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Clique em `Create Token`
3. Dê um nome descritivo (ex: "GitHub Actions CI")
4. Selecione o escopo apropriado (geralmente "Full Account")
5. Clique em `Create`
6. Copie o token gerado

**Como configurar:**
1. Vá para `Settings` > `Secrets and variables` > `Actions` no seu repositório GitHub
2. Clique em `New repository secret`
3. Nome: `VERCEL_TOKEN`
4. Valor: O token copiado

## Secrets Opcionais para Supabase (se necessário)

Se seus testes ou builds precisam acessar Supabase:

### SUPABASE_URL
URL do projeto Supabase.

### SUPABASE_ANON_KEY
Chave anônima do Supabase (pública, mas necessária para testes).

### SUPABASE_SERVICE_ROLE_KEY
Chave de serviço do Supabase (usada apenas para testes ou scripts de administração).

**Importante:** Nunca use a service role key em builds de produção. Use apenas para scripts de testes ou migrações.

## Secrets para Codecov (opcional)

Se você quer reports de cobertura de código:

### CODECOV_TOKEN
Token para upload de reports de cobertura para Codecov.

**Como obter:**
1. Crie uma conta em [codecov.io](https://codecov.io)
2. Adicione seu repositório
3. Copie o token fornecido

## Como Testar a Configuração

Após configurar os secrets, você pode testar se tudo está funcionando:

1. Crie uma nova branch:
```bash
git checkout -b test-ci-fix
```

2. Faça uma pequena alteração e commit:
```bash
git touch test.txt
git add test.txt
git commit -m "Test CI configuration"
```

3. Push e abra um PR:
```bash
git push origin test-ci-fix
```

4. Vá para a aba `Actions` no GitHub e veja se os workflows estão rodando sem erros

## Troubleshooting

### Erro: "Secret VERCEL_ORG_ID not set"
**Solução:** Verifique se você configurou o secret `VERCEL_ORG_ID` nas configurações do repositório.

### Erro: "Error: Unable to authenticate"
**Solução:** Verifique se o token Vercel é válido e tem as permissões corretas.

### Erro: "Project not found"
**Solução:** Verifique se o `VERCEL_PROJECT_ID` está correto e se o projeto existe na sua conta Vercel.

### Erro: "Failed to install dependencies"
**Solução:** Verifique se o arquivo `pnpm-lock.yaml` existe e está atualizado. Rode `pnpm install` localmente e commit as mudanças.

## Segurança

- Nunca faça commit de secrets no repositório
- Use tokens com escopo mínimo necessário
- Revogue tokens que não estão mais em uso
- Atualize tokens regularmente

## Recursos Adicionais

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel API Tokens](https://vercel.com/docs/rest-api/introduction)
