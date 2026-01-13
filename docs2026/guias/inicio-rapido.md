# Guia de Início Rápido

## ⚡ Setup em 5 Minutos

### 1. Pré-requisitos

```bash
# Verifique se tem Node.js 18+
node --version  # deve ser v18+

# Instale pnpm se não tiver
npm install -g pnpm@9.15.0
```

### 2. Clone e Instale

```bash
git clone https://github.com/fisioflow/fisioflow.git
cd fisioflow
pnpm install
```

### 3. Configure o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **Settings → API**
3. Copie a URL e a anon key
4. Crie o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 4. Execute as Migrations

No **SQL Editor** do Supabase, execute:

```sql
-- Execute todos os arquivos em supabase/migrations/
-- em ordem cronológica
```

Ou via CLI:

```bash
supabase link --project-ref seu-project-id
supabase db push
```

### 5. Inicie o Servidor

```bash
pnpm dev
```

Acesse: [http://localhost:8080](http://localhost:8080)

## 👤 Criar Usuário Admin

No **SQL Editor** do Supabase:

```sql
-- Crie um usuário admin
insert into profiles (id, email, full_name, role, organization_id)
values (
  'seu-user-id-do-auth',
  'admin@fisioflow.com',
  'Administrador',
  'admin',
  gen_random_uuid()
);
```

## 🎉 Pronto!

Você está com o FisioFlow rodando localmente!

## 📚 Próximos Passos

- [Estrutura do Projeto](../04-estrutura-projeto.md) - Entenda a organização
- [Componentes UI](../08-componentes-ui.md) - Aprenda a usar os componentes
- [Guia de Contribuição](../12-guia-contribuicao.md) - Como contribuir

## ❓ Problemas Comuns

### "Module not found"
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Porta 8080 em uso
```bash
pnpm dev --port 3000
```

### Erro de CORS no Supabase
Verifique se as credenciais no `.env` estão corretas e se o RLS está configurado.

## 🔗 Links Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Vite](https://vitejs.dev/)
- [Documentação React](https://react.dev/)
