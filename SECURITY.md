# 🔒 Segurança - FisioFlow

## Visão Geral

O FisioFlow foi desenvolvido com segurança em primeiro lugar, seguindo as melhores práticas da indústria para aplicações de saúde.

## 🛡️ Medidas de Segurança Implementadas

### Backend (Supabase)

#### Row Level Security (RLS)
- ✅ **Todas as tabelas** possuem políticas RLS ativadas
- ✅ Acesso baseado em roles (admin, fisioterapeuta, estagiario, paciente)
- ✅ Filtros automáticos por tenant/organização
- ✅ Verificação de ownership em operações de update/delete

#### Autenticação
- ✅ JWT tokens com expiração configurável
- ✅ Refresh tokens rotation
- ✅ Multi-factor authentication (MFA) disponível
- ✅ Proteção contra brute-force nas tentativas de login

#### Criptografia
- ✅ Dados sensíveis criptografados em repouso
- ✅ Comunicação via TLS 1.3
- ✅ Hash de senhas com bcrypt (cost factor 12)
- ✅ API keys com permissões granulares

### Frontend

#### Headers de Segurança
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)
Content-Security-Policy: default-src 'self'
```

#### Proteções XSS
- ✅ React 18 com escaping automático
- ✅ Sanitização de HTML em campos de usuário
- ✅ Content Security Policy (CSP) configurada
- ✅ Validação de entrada com Zod schemas

#### Proteções CSRF
- ✅ Tokens CSRF em formulários críticos
- ✅ SameSite cookies configurados
- ✅ Origin verification em APIs

### Auditoria e Compliance

#### LGPD Compliance
- ✅ Consentimento explícito para coleta de dados
- ✅ Direito ao esquecimento (deleção de dados)
- ✅ Portabilidade de dados
- ✅ Minimização de dados coletados
- ✅ Anonimização de dados em relatórios

#### Trilhas de Auditoria
- ✅ Log de todas as operações críticas
- ✅ Rastreamento de who/when/what
- ✅ Logs imutáveis (append-only)
- ✅ Retenção configurável (default: 2 anos)

## 🔐 Variáveis de Ambiente

### Obrigatórias

```bash
# Supabase (Backend)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Apenas backend
```

### Opcionais

```bash
# Analytics (Respeita à privacidade)
VITE_ENABLE_ANALYTICS=true/false
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Feature Flags
VITE_FEATURE_MAINTENANCE_MODE=false
VITE_FEATURE_BETA_FEATURES=false

# Segurança
CRON_SECRET=your_random_secret_here
```

## ⚠️ Boas Práticas

### Para Desenvolvedores

1. **Nunca commitar credenciais**
   ```bash
   # ❌ ERRADO
   .env.production com chaves reais

   # ✅ CORRETO
   .env.example com placeholders
   ```

2. **Usar variáveis de ambiente**
   ```typescript
   // ❌ ERRADO
   const apiKey = 'sk_live_1234567890'

   // ✅ CORRETO
   const apiKey = import.meta.env.VITE_API_KEY
   ```

3. **Validar entrada do usuário**
   ```typescript
   import { z } from 'zod'

   const patientSchema = z.object({
     name: z.string().min(3).max(100),
     email: z.string().email(),
     phone: z.string().regex(/^\d{10,11}$/)
   })
   ```

4. **Usar prepared statements**
   ```typescript
   // ❌ ERRADO - SQL Injection
   const query = `SELECT * FROM patients WHERE name = '${name}'`

   // ✅ CORRETO - Supabase client (automatic prepared statements)
   const { data } = await supabase
     .from('patients')
     .select('*')
     .eq('name', name)
   ```

### Para Operações

1. **Rotation de chaves**
   - Rodar a cada 90 dias
   - Usar ferramentas de secrets management (Vercel Env, AWS Secrets Manager)
   - Notificar equipe com antecedência

2. **Monitoramento**
   - Configurar alertas no Sentry/Vercel
   - Revisar logs de segurança semanalmente
   - Penetration testing trimestral

3. **Backups**
   - Backups diários automáticos
   - Backups armazenados em região diferente
   - Teste de restore mensal

## 🔍 Auditoria de Segurança

### Checklist

- [ ] RLS ativado em todas as tabelas
- [ ] MFA habilitado para usuários admin
- [ ] Certificado SSL válido (auto-renovação)
- [ ] Headers de segurança configurados
- [ ] Rate limiting em APIs públicas
- [ ] Logs de auditoria ativos
- [ ] Vulnerability scan passando
- [ ] Dependências atualizadas
- [ ] Política de privacidade publicada
- [ ] Termos de uso aceitos

### Ferramentas Recomendadas

```bash
# Scan de vulnerabilidades
npm audit
pnpm audit

# Snyk (security scanning)
npx snyk test

# OWASP ZAP (security testing)
# Rodar antes de cada release major
```

## 🚨 Incident Response

### Em caso de vazamento de dados

1. **Identificar** - Qual dado foi vazado?
2. **Conter** - Revogar chaves comprometidas
3. **Notificar** - Usuários afetados + autoridades (LGPD)
4. **Documentar** - Timeline do incidente
5. **Prevenir** - Root cause analysis

### Contatos de Emergência

- **Security Team**: security@fisioflow.com
- **Data Protection Officer**: dpo@fisioflow.com
- **Incident Response**: https://security.fisioflow.com

## 📚 Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/anatel/pt-br/regulares/lgpd)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Vercel Security](https://vercel.com/docs/security)

---

**Última atualização**: Janeiro 2026
**Versão**: 1.0.0
**Status**: ✅ Compliant
