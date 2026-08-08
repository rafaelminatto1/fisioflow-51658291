# Guia de Migração de Autenticação: Neon Auth (Beta) para Better Auth Gerenciado

Este documento descreve o plano e a configuração para migrar da versão atual do Neon Auth (em fase beta) para o serviço gerenciado Better Auth, que inclui suporte a provedores de login social (Google, Apple).

## Estado Atual
- Utiliza a infraestrutura `@neondatabase/auth` (Neon Auth Beta).
- Validação de JWT feita via JWKS remoto com a biblioteca `jose`.
- Resolução de perfis e sessões integradas com Drizzle ORM/Neon PostgreSQL (`neon_auth` schema).
- Arquivos de configuração espalhados, principalmente em `apps/api/src/lib/auth.ts` e `patientAuth.ts`.
- Configuração dependente de variáveis de ambiente do Cloudflare Workers (`NEON_AUTH_URL`, `NEON_AUTH_JWKS_URL`).

## Estado Desejado (Target State)
- Implementação gerenciada do **Better Auth**.
- Suporte a provedores de login social:
  - **Google OAuth**
  - **Apple Sign-In**
- Fallback para e-mail e senha.
- Manter o schema de banco de dados e perfis sincronizados no Postgres via adaptador do Drizzle.
- Compatibilidade contínua com Web (Vite) e Mobile (React Native/Expo).

## Checklist de Migração
1. **Configuração do Better Auth**:
   - [ ] Implementar a instância base usando `createBetterAuthConfig()` em `apps/api/src/lib/auth/better-auth-config.ts`.
   - [ ] Obter e adicionar as credenciais (`CLIENT_ID`, `CLIENT_SECRET`, etc.) do Google e Apple no Cloudflare `wrangler.toml` (ambiente de staging e prod).
2. **Atualização do Drizzle / Database**:
   - [ ] Validar compatibilidade do Drizzle adapter do Better Auth com as tabelas de sessão/usuário atuais (`neon_auth.session`, `neon_auth.user`).
   - [ ] Executar migrations se novas colunas (ex: `provider`, `providerAccountId`) precisarem ser adicionadas.
3. **Refatoração dos Middlewares (`auth.ts` e `patientAuth.ts`)**:
   - [ ] Adaptar a validação de sessão usando os métodos embutidos do Better Auth (em vez de validação JWKS explícita com `jose` se Better Auth for gerenciar nativamente as requisições).
   - [ ] Garantir isolamento entre perfis de `patient` (Paciente) e staff.
4. **Atualização do Cliente (Web / Mobile)**:
   - [ ] Integrar o cliente do Better Auth (`@better-auth/client`) nos projetos frontend.
   - [ ] Habilitar os botões de "Entrar com Google" e "Entrar com Apple".
   - [ ] Lidar com redirecionamentos profundos (deep links) no Expo.

## Possíveis Breaking Changes (Atenção)
- **Sessões e Cookies**: A nomenclatura de cookies e o formato de token do Better Auth podem divergir das expectativas passadas. É preciso unificar a leitura de cookies (atualmente verifica-se múltiplos possíveis chaves em `auth.ts`).
- **Validação de Token**: A verificação via banco de dados customizada em `auth.ts` poderá precisar ser substituída pelas APIs nativas do Better Auth para checagem de sessão opaca.
- **Tipos e IDs de Usuário**: Better Auth armazena um ID específico; certifique-se de que o cruzamento de perfis na tabela `public.profiles` continua a encontrar a correspondência correta via `user_id` ou auto-sincronização por `email`.

## Plano de Testes
1. Realizar login com E-mail/Senha (método legado) e validar se o usuário é mapeado para a organização e role corretos.
2. Realizar login com Google; confirmar se uma nova conta é provisionada ou linkada por e-mail a um perfil pré-existente.
3. Realizar login com Apple (no iOS e Web); validar as restrições da Apple relativas ao "Ocultar meu E-mail".
4. Validar o acesso isolado do *Patient Portal* (pacientes vs profissionais não devem misturar escopos).
5. Checar a renovação de tokens de sessão após 24 horas.

## Estratégia de Rollback
- O código das novas configurações foi desenvolvido de forma aditiva (`apps/api/src/lib/auth/social-providers.ts` e `better-auth-config.ts`).
- Se houver falha, inverta os mapeamentos de middleware no `hono` para utilizar exclusivamente os métodos contidos em `apps/api/src/lib/auth.ts` antigo.
- Não remova as rotinas de verificação JWT por JWKS (`jose`) até ter 100% de confiança no proxy ou servidor nativo do Better Auth.
