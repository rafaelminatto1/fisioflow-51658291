# ADR-0005 — Identidade, membership e autorização

**Status:** Aceita (2026-07-14) — emissor = **Better Auth** (self-hosted)

## Decisão do proprietário (2026-07-14)

- **Emissor:** **Better Auth**, self-hosted dentro do Worker Cloudflare (`nodejs_compat`). Usuários, sessões e config de OAuth ficam no **Neon Postgres** (schema próprio, compatível com RLS) — sem servidor de auth separado, sem sincronização por webhook.
- **Login do paciente:** telefone (OTP), e-mail/magic link, Google e **Apple** (suporta o fluxo por ID Token, ideal para o app iOS nativo; conta Apple Developer já existente).
- **Login do staff:** somente e-mail.
- **Audiences separadas:** paciente e equipe usam "portas" distintas de autenticação; cada superfície habilita só seus métodos; sessões e escopos não se misturam.
- **OTP de telefone:** enviar preferencialmente via **WhatsApp Business API** (já contratada pela clínica) em vez de SMS pago; SMS (ex.: Twilio) como reserva. O plugin de telefone do Better Auth permite plugar o remetente.
- **Cargos:** manter os 6 (ver DEC-004/DEC-020). Visibilidade financeira restrita para fisioterapeuta/estagiário (ver DEC-020).

### Notas de implementação (docs atuais, jul/2026)

- Padrão confirmado pelo exemplo oficial do Hono ("Better Auth on Cloudflare"): Hono + Better Auth + Drizzle (`provider: 'pg'`) + Neon; handler em `/api/auth/*`.
- Conectar ao Neon **via Hyperdrive** (coerente com o baseline), não conexão direta.
- **KV** para rate limiting nativo do Better Auth (cobre parte da lacuna A4 do legado — OTP sem rate limit).
- Plugin **Organization** do Better Auth entrega org + membership + convites prontos — usar em vez de reconstruir; encaixa no isolamento por `organization_id`/RLS.
- E-mails de auth (magic link, verificação, reset) podem sair pelo **Cloudflare Email Service** (`env.EMAIL.send()`), ver DEC-026.

### Por que Better Auth e não Neon Auth gerenciado ou Clerk

- **Neon Auth** hoje é o *próprio Better Auth gerenciado*, mas o console só oferece OAuth de **Google/GitHub/Vercel — sem Apple**, o que inviabiliza o app iPhone. Better Auth "puro" tem Apple nativo hoje, sem sair do ecossistema Neon+Cloudflare. Se a Apple for adicionada ao gerenciado, migrar é de baixo atrito (mesma engine, migração documentada pela Neon).
- **Clerk** resolveria todos os métodos, mas os usuários ficariam fora do Neon (sync por webhook), quebrando o RLS limpo e o princípio de dados sob controle; além de ser vendor pago acima do tier grátis. Descartado.

- Demais princípios conceituais abaixo permanecem válidos.

## Decisão conceitual

- Um emissor de identidade, com audiences/sessões apropriadas para staff e paciente.
- Identidade é separada de membership e do registro de paciente.
- `pending` é estado, não role.
- Permissions server-side são a autoridade; UI apenas reflete.
- Paciente acessa exclusivamente o próprio subject vinculado.
- Sem organização default, vínculo por e-mail automático ou fallback `viewer`.
- Convites têm e-mail/subject vinculados, expiração, uso único e criação autorizada.
- Revogação de membership invalida acesso dentro de SLA medido.

## Bootstrap de sessão e contexto

1. Validar criptograficamente o token externo, incluindo `issuer`, `audience`, expiração e `subject`.
2. Usar um resolver interno mínimo para mapear o subject a `identity` e retornar candidatos com seus estados e versões; isso permite negar de modo explícito `pending`, `suspended` e `revoked` sem lhes conceder contexto.
3. Emitir/estabelecer sessão interna somente para membership ou vínculo **ativo e elegível**, vinculada a `identityId` e a um `membershipId`/`patientLinkId` verificado, incluindo versão de autorização para invalidação.
4. Em cada request, revalidar o vínculo necessário antes de aplicar o contexto transacional de RLS.

Se houver múltiplas memberships ativas, o usuário escolhe explicitamente pelo contrato `GET /api/v1/auth/contexts` → `POST /api/v1/auth/context`; a API verifica esse `membershipId` e `organizationId` enviado no body/query nunca é autoridade. O resolver privilegiado deve ter superfície estreita, `search_path` fixo e grants revisados, em vez de acesso amplo às tabelas clínicas.

## Requisitos para escolher fornecedor

- Apple/email/passkey conforme necessidade real;
- sessões web e mobile seguras;
- JWKS, issuer e audience estritos;
- organizações/memberships sem acoplamento irreversível;
- exportação e exclusão;
- MFA/passkeys aplicáveis, não apenas UI decorativa;
- webhooks assinados e idempotentes;
- custo e suporte na região alvo.

## Opções a avaliar

Neon Auth/Better Auth, provedor gerenciado compatível ou Better Auth self-hosted. A escolha exige spike com login, revogação, convite, paciente, RLS e recuperação de conta; não decidir por checklist de marketing. O spike deve cobrir memberships `pending`, suspensas, revogadas e múltiplas, além de vínculo de paciente revogado e invalidação por versão de autorização.
