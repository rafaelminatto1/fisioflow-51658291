# Plano de Testes Completo - FisioFlow Produção

## Informações do Sistema

**URL Produção:** https://fisioflow-migration.web.app
**Projeto Firebase:** fisioflow-migration
**Projeto GCloud:** fisioflow-migration

### Configuração reCAPTCHA Enterprise

| Configuração | Valor |
|--------------|-------|
| Site Key | `6LcTJVksAAAAACRBNy4BxFyvTWduSZq3Mmxv74lT` |
| Domínios Permitidos | moocafisio.com.br, localhost, 127.0.0.1, fisioflow-migration.web.app, web.app |
| Tipo | SCORE (Invisible reCAPTCHA) |

---

## Plano de Testes

### FASE 1: Testes de Infraestrutura (Automatizados)

#### 1.1 Verificar Hosting
```bash
curl -I https://fisioflow-migration.web.app
```
✅ Esperado: HTTP 200, content-type: text/html

#### 1.2 Verificar Firebase Functions
```bash
firebase functions:list
```
✅ Esperado: 75+ funções ativas

#### 1.3 Verificar Firestore Rules
```bash
firebase firestore:rulescheck
```

#### 1.4 Verificar Storage Rules
```bash
firebase storage:rulescheck
```

---

### FASE 2: Testes de Banco de Dados

#### 2.1 Verificar Schema organizations
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name IN ('slug', 'active');
```
✅ Esperado: slug (text), active (boolean)

#### 2.2 Verificar conexão Cloud SQL
```bash
gcloud sql instances describe fisioflow-pg
```
✅ Esperado: status RUNNABLE

---

### FASE 3: Testes de Autenticação (Playwright)

#### 3.1 Acessar página de login
- URL: https://fisioflow-migration.web.app/auth/login
- ✅ Verificar: página carrega sem erros

#### 3.2 Verificar console do navegador
- ✅ Nenhum erro de "column slug does not exist"
- ✅ Nenhum erro de "column active does not exist"
- ✅ App Check inicializa corretamente

#### 3.3 Tentar login com Google
- ✅ Botão Google visível
- ✅ Redirecionamento funciona

---

### FASE 4: Testes de API (Automatizados)

#### 4.1 Health Check
```bash
curl https://us-central1-fisioflow-migration.cloudfunctions.net/healthCheck
```

#### 4.2 Testar getProfile
```bash
# Requer token de autenticação
curl -X POST https://us-central1-fisioflow-migration.cloudfunctions.net/getProfile
```

#### 4.3 Testar listPatients
```bash
# Requer token de autenticação
curl -X POST https://us-central1-fisioflow-migration.cloudfunctions.net/listPatients
```

---

### FASE 5: Testes E2E (Playwright)

#### 5.1 Fluxo Completo de Autenticação
1. Acessar https://fisioflow-migration.web.app
2. Clicar em "Entrar"
3. Selecionar login com Google
4. Completar autenticação
5. ✅ Verificar: Usuário logado, redirecionado para dashboard

#### 5.2 Testar Criação de Paciente
1. Navegar para /patients
2. Clicar em "Novo Paciente"
3. Preencher formulário
4. ✅ Verificar: Paciente criado, lista atualizada

---

### FASE 6: Testes de Performance

#### 6.1 Lighthouse CI
```bash
npx lighthouse https://fisioflow-migration.web.app --view
```

#### 6.2 Core Web Vitals
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

---

## Execução dos Testes

### MCPs Disponíveis para Testes:

1. **Playwright MCP** - Testes E2E do navegador
2. **Firebase MCP** - Verificar configuração e logs
3. **Supabase MCP** - (não aplicável, usando Cloud SQL)
4. **Vercel MCP** - (não aplicável, usando Firebase)
5. **Web Search MCP** - Buscar informações de erro
6. **Image Analysis MCP** - Analisar screenshots de erros

---

## Critérios de Sucesso

| Teste | Status Esperado |
|-------|-----------------|
| Acesso à aplicação | HTTP 200 |
| Console sem erros | 0 erros críticos |
| Login Google | Funciona |
| Banco de dados | slug + active presentes |
| Health check | Retorna 200 |
| Firebase Functions | Todas ativas |
| Lighthouse Performance | > 70 |

---

## Relatório Final

Após execução dos testes, gerar relatório com:
- ✅ Testes passados
- ❌ Testes falhados
- ⚠️ Avisos
- 📋 Recomendações
